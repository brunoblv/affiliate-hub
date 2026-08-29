import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Destino, Rede, type Produto } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
import {
  montarTextoDaLista,
  montarTextoDoPost,
  type EntradaTexto,
  type EntradaTextoDaLista,
} from "@/lib/conteudo/texto-do-post";
import { LABEL_CATEGORIA } from "@/lib/produtos";
import { registrar } from "@/lib/log";

/**
 * Legenda de rede social via Gemini: a IA só escreve gancho, descrição e CTA.
 * Preço, desconto, link e disclosure entram por código — nunca inventados.
 * Se a API falhar ou a chave não existir, cai no template determinístico.
 */

type TipoPostSocial = "PROMOTION" | "PRICE_DROP" | "FEATURED" | "NORMAL" | "NEW";

interface PartesProduto {
  abertura: string;
  descricaoCurta: string;
  beneficios: string[];
  cta: string;
}

interface PartesLista {
  abertura: string;
  chamada: string;
  cta: string;
}

const SCHEMA_PRODUTO = {
  type: "OBJECT",
  properties: {
    abertura: { type: "STRING" },
    descricaoCurta: { type: "STRING" },
    beneficios: { type: "ARRAY", items: { type: "STRING" } },
    cta: { type: "STRING" },
  },
  required: ["abertura", "descricaoCurta", "beneficios", "cta"],
};

const SCHEMA_LISTA = {
  type: "OBJECT",
  properties: {
    abertura: { type: "STRING" },
    chamada: { type: "STRING" },
    cta: { type: "STRING" },
  },
  required: ["abertura", "chamada", "cta"],
};

const LABEL_REDE: Record<Rede, string> = {
  [Rede.FACEBOOK_PAGE]: "Facebook (página)",
  [Rede.FACEBOOK_GROUP]: "Facebook (grupo)",
  [Rede.INSTAGRAM]: "Instagram",
  [Rede.TELEGRAM]: "Telegram",
  [Rede.WHATSAPP]: "WhatsApp",
};

const LABEL_DESTINO: Record<Destino, string> = {
  [Destino.MEU_NOVO_LAR]: "Meu Novo Lar",
  [Destino.TIKTOK_SHOP]: "TikTok Shop",
  [Destino.UMBANDA]: "Umbanda",
};

const TOM_DESTINO: Record<Destino, string> = {
  [Destino.MEU_NOVO_LAR]:
    "Casa, organização e decoração. Direto e prático, como indicação de quem monta a casa — sem hype de marketplace.",
  [Destino.TIKTOK_SHOP]:
    "Achadinhos. Mais promocional e visual, mas honesto: sem falsa urgência e sem inventar vantagem.",
  [Destino.UMBANDA]:
    "Produtos de Umbanda e espiritualidade. Respeitoso, sem tom agressivo de oferta, sem reduzir o sagrado a propaganda.",
};

const LABEL_PLATAFORMA: Record<Produto["plataforma"], string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

const ABERTURA_PADRAO: Record<TipoPostSocial, string> = {
  PROMOTION: "🔥 OFERTA",
  PRICE_DROP: "📉 O PREÇO BAIXOU",
  FEATURED: "✨ PRODUTO EM DESTAQUE",
  NORMAL: "🛍️ ACHADINHO",
  NEW: "✨ NOVIDADE",
};

const DISCLOSURE = "⚠️ Preço e disponibilidade podem mudar.\n*Link de afiliado — não custa nada a mais para você, e ajuda o site.";

const URL_EM_TEXTO = /https?:\/\/\S+/gi;
const PRECO_EM_TEXTO = /R\$\s*[\d.,]+/gi;
const HTML_TAGS = /<\/?[^>]+>/g;

const promptsCarregados = new Map<string, string>();

async function carregarPrompt(arquivo: string): Promise<string> {
  const cache = promptsCarregados.get(arquivo);
  if (cache) return cache;
  const conteudo = await readFile(join(process.cwd(), "prompts", arquivo), "utf-8");
  promptsCarregados.set(arquivo, conteudo);
  return conteudo;
}

function geminiDisponivel(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function reais(valor: unknown): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));
}

function descontoPercentual(atual: unknown, original: unknown): number | null {
  const a = Number(atual);
  const o = Number(original);
  if (!o || o <= a) return null;
  return Math.round(((o - a) / o) * 100);
}

function limparCampo(valor: unknown, max = 600): string {
  if (typeof valor !== "string") return "";
  return valor
    .replace(HTML_TAGS, "")
    .replace(URL_EM_TEXTO, "")
    .replace(PRECO_EM_TEXTO, "")
    .replace(/\*\*|__/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function tipoDoPost(produto: Produto): TipoPostSocial {
  const desconto = descontoPercentual(produto.precoAtual, produto.precoOriginal);
  const idadeMs = Date.now() - new Date(produto.criadoEm).getTime();
  const seteDias = 7 * 24 * 60 * 60 * 1000;

  if (desconto !== null && desconto >= 15) return "PROMOTION";
  if (desconto !== null) return "PRICE_DROP";
  if (idadeMs >= 0 && idadeMs <= seteDias) return "NEW";
  return "FEATURED";
}

function blocoPreco(produto: Produto): string {
  const desconto = descontoPercentual(produto.precoAtual, produto.precoOriginal);
  if (desconto !== null) {
    return [`💰 DE ${reais(produto.precoOriginal)}`, `🔥 POR ${reais(produto.precoAtual)}`, `📉 ${desconto}% OFF`].join("\n");
  }
  return `💰 ${reais(produto.precoAtual)}`;
}

function linhaDeLink(rede: Rede, link: string, ctaInstagram = "🔗 Confira no link da bio."): string {
  if (rede === Rede.INSTAGRAM) return ctaInstagram;
  return link;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

function preencher(base: string, campos: Record<string, string>): string {
  let texto = base;
  for (const [chave, valor] of Object.entries(campos)) {
    texto = texto.replaceAll(`{{${chave}}}`, valor);
  }
  return texto;
}

/** Legenda de um produto, adaptada à rede. */
export async function gerarLegendaDoProduto(entrada: EntradaTexto): Promise<string> {
  if (!geminiDisponivel()) return montarTextoDoPost(entrada);

  try {
    const partes = await pedirPartesProduto(entrada);
    return montarLegendaProduto(entrada, partes);
  } catch (erro) {
    await registrar("ERRO", "CONTEUDO", `Gemini falhou na legenda do produto, usando template. ${mensagemErro(erro)}`, {
      produto: entrada.produto.slug,
      rede: entrada.rede,
    });
    return montarTextoDoPost(entrada);
  }
}

/** Legenda de uma Lista (roundup), sempre apontando pro blog. */
export async function gerarLegendaDaLista(entrada: EntradaTextoDaLista): Promise<string> {
  if (!geminiDisponivel()) return montarTextoDaLista(entrada);

  try {
    const partes = await pedirPartesLista(entrada);
    return montarLegendaLista(entrada, partes);
  } catch (erro) {
    await registrar("ERRO", "CONTEUDO", `Gemini falhou na legenda da lista, usando template. ${mensagemErro(erro)}`, {
      post: entrada.post.slug,
      rede: entrada.rede,
    });
    return montarTextoDaLista(entrada);
  }
}

async function pedirPartesProduto({ produto, rede, comentario }: EntradaTexto): Promise<PartesProduto> {
  const tipo = tipoDoPost(produto);
  const desconto = descontoPercentual(produto.precoAtual, produto.precoOriginal);
  const descricao = [produto.descricao?.trim(), comentario?.trim()].filter(Boolean).join("\n\n") || "(sem descrição)";

  const prompt = preencher(await carregarPrompt("legenda-produto.md"), {
    rede: LABEL_REDE[rede],
    destino: LABEL_DESTINO[produto.destino],
    tomDestino: TOM_DESTINO[produto.destino],
    nome: produto.nome,
    categoria: LABEL_CATEGORIA[produto.categoria],
    plataforma: LABEL_PLATAFORMA[produto.plataforma],
    precoAtual: reais(produto.precoAtual),
    precoOriginal: produto.precoOriginal ? reais(produto.precoOriginal) : "(não informado — não mencione preço antigo)",
    desconto: desconto !== null ? `${desconto}%` : "(sem desconto real — não invente)",
    tipoPost: tipo,
    descricao: descricao.slice(0, 1500),
    notaEditorial: produto.notaEditorial?.trim() || "(sem nota editorial)",
  });

  const bruto = await gerarJson<PartesProduto>({ prompt, schema: SCHEMA_PRODUTO, temperature: 0.8 });
  const beneficios = (Array.isArray(bruto.beneficios) ? bruto.beneficios : [])
    .map((item) => limparCampo(item, 60))
    .filter(Boolean)
    .slice(0, 3);

  return {
    abertura: limparCampo(bruto.abertura, 80) || ABERTURA_PADRAO[tipo],
    descricaoCurta: limparCampo(bruto.descricaoCurta, 500),
    beneficios,
    cta: limparCampo(bruto.cta, 80) || "🛒 VER OFERTA",
  };
}

async function pedirPartesLista({ post, rede }: EntradaTextoDaLista): Promise<PartesLista> {
  const prompt = preencher(await carregarPrompt("legenda-lista.md"), {
    rede: LABEL_REDE[rede],
    destino: LABEL_DESTINO[post.destino],
    tomDestino: TOM_DESTINO[post.destino],
    titulo: post.titulo,
    resumo: post.resumo?.trim() || "(sem resumo — não invente detalhes da lista)",
  });

  const bruto = await gerarJson<PartesLista>({ prompt, schema: SCHEMA_LISTA, temperature: 0.8 });
  return {
    abertura: limparCampo(bruto.abertura, 80) || "📋 LISTA",
    chamada: limparCampo(bruto.chamada, 500),
    cta: limparCampo(bruto.cta, 80) || "👉 CONFERIR A LISTA",
  };
}

function montarLegendaProduto({ produto, rede, link }: EntradaTexto, partes: PartesProduto): string {
  const linhas: string[] = [partes.abertura, "", produto.nome, "", blocoPreco(produto)];

  if (partes.descricaoCurta) {
    linhas.push("", partes.descricaoCurta);
  }

  if (partes.beneficios.length > 0) {
    linhas.push("");
    for (const beneficio of partes.beneficios) {
      linhas.push(beneficio.startsWith("✅") ? beneficio : `✅ ${beneficio}`);
    }
  }

  linhas.push("", partes.cta, linhaDeLink(rede, link), "", DISCLOSURE);
  return linhas.join("\n").trim();
}

function montarLegendaLista({ post, rede, link }: EntradaTextoDaLista, partes: PartesLista): string {
  const linhas: string[] = [partes.abertura, "", post.titulo];

  if (partes.chamada) {
    linhas.push("", partes.chamada);
  }

  linhas.push("", partes.cta, linhaDeLink(rede, link, "🔗 Confira a lista no link da bio."), "", DISCLOSURE);
  return linhas.join("\n").trim();
}
