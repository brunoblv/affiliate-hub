import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Destino, type Produto } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
import { LABEL_CATEGORIA } from "@/lib/produtos";
import { registrar } from "@/lib/log";
import { LABEL_DESTINO, TOM_DESTINO } from "./destinos";
import { diaDaSemana, formatarDataCivil } from "./data";
import type { ItemCurado } from "./curadoria";

export interface TextosLanding {
  headline: string;
  metaTitulo: string;
  metaDescricao: string;
  itens: Record<string, { tituloCurto: string; descricao: string }>;
  viaGemini: boolean;
}

interface SaidaGemini {
  headline: string;
  metaTitulo: string;
  metaDescricao: string;
  itens: { id: string; tituloCurto: string; descricao: string }[];
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    metaTitulo: { type: "STRING" },
    metaDescricao: { type: "STRING" },
    itens: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          tituloCurto: { type: "STRING" },
          descricao: { type: "STRING" },
        },
        required: ["id", "tituloCurto", "descricao"],
      },
    },
  },
  required: ["headline", "metaTitulo", "metaDescricao", "itens"],
};

const HTML_TAGS = /<\/?[^>]+>/g;
const MARKDOWN = /\*\*|__/g;

function reais(valor: unknown): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));
}

function limpar(valor: unknown, max: number): string {
  if (typeof valor !== "string") return "";
  return valor
    .replace(HTML_TAGS, "")
    .replace(MARKDOWN, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function geminiDisponivel(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function fallbackDoProduto(produto: Produto, desconto: number | null): { tituloCurto: string; descricao: string } {
  if (desconto !== null) {
    return {
      tituloCurto: limpar(produto.nome, 50) || produto.nome.slice(0, 50),
      descricao: `${reais(produto.precoOriginal)} por ${reais(produto.precoAtual)} — ${desconto}% OFF`,
    };
  }
  return {
    tituloCurto: limpar(produto.nome, 50) || produto.nome.slice(0, 50),
    descricao: reais(produto.precoAtual),
  };
}

function textosFallback(destino: Destino, data: Date, itens: ItemCurado[]): TextosLanding {
  const nome = LABEL_DESTINO[destino];
  const maior = Math.max(0, ...itens.map((i) => i.desconto ?? 0));
  const headline =
    maior > 0
      ? `${nome} de ${diaDaSemana(data)}: até ${maior}% off`
      : `Ofertas de ${diaDaSemana(data)} — ${nome}`;

  const mapa: TextosLanding["itens"] = {};
  for (const item of itens) {
    mapa[item.produto.id] = fallbackDoProduto(item.produto, item.desconto);
  }

  return {
    headline: headline.slice(0, 80),
    metaTitulo: headline.slice(0, 60),
    metaDescricao: `Seleção do dia em ${nome}: destaques e promoções de ${formatarDataCivil(data)}.`.slice(0, 155),
    itens: mapa,
    viaGemini: false,
  };
}

function preencher(base: string, campos: Record<string, string>): string {
  let texto = base;
  for (const [chave, valor] of Object.entries(campos)) {
    texto = texto.replaceAll(`{{${chave}}}`, valor);
  }
  return texto;
}

function blocoProdutos(itens: ItemCurado[]): string {
  return itens
    .map((item, i) => {
      const p = item.produto;
      const linhas = [
        `${i + 1}. id=${p.id}`,
        `   nome: ${p.nome}`,
        `   categoria: ${LABEL_CATEGORIA[p.categoria]}`,
        `   preço atual: ${reais(p.precoAtual)}`,
        `   preço original: ${p.precoOriginal ? reais(p.precoOriginal) : "(não informado)"}`,
        `   desconto: ${item.desconto !== null ? `${item.desconto}%` : "(sem desconto real — não invente)"}`,
        `   nota editorial: ${p.notaEditorial?.trim() || "(sem nota)"}`,
      ];
      return linhas.join("\n");
    })
    .join("\n\n");
}

let promptCache: string | null = null;

async function carregarPrompt(): Promise<string> {
  if (promptCache) return promptCache;
  promptCache = await readFile(join(process.cwd(), "prompts", "vitrine.md"), "utf-8");
  return promptCache;
}

function mesclarComFallback(destino: Destino, data: Date, itens: ItemCurado[], bruto: SaidaGemini): TextosLanding {
  const base = textosFallback(destino, data, itens);
  const porId = new Map((Array.isArray(bruto.itens) ? bruto.itens : []).map((item) => [item.id, item]));

  const mapa: TextosLanding["itens"] = {};
  for (const item of itens) {
    const gerado = porId.get(item.produto.id);
    const fb = base.itens[item.produto.id];
    mapa[item.produto.id] = {
      tituloCurto: limpar(gerado?.tituloCurto, 50) || fb.tituloCurto,
      descricao: limpar(gerado?.descricao, 180) || fb.descricao,
    };
  }

  return {
    headline: limpar(bruto.headline, 80) || base.headline,
    metaTitulo: limpar(bruto.metaTitulo, 60) || base.metaTitulo,
    metaDescricao: limpar(bruto.metaDescricao, 155) || base.metaDescricao,
    itens: mapa,
    viaGemini: true,
  };
}

/** Uma chamada estruturada para a landing inteira. Fallback estático se a API falhar. */
export async function gerarTextosDaLanding(
  destino: Destino,
  data: Date,
  itens: ItemCurado[],
): Promise<TextosLanding> {
  const fallback = textosFallback(destino, data, itens);
  if (!geminiDisponivel() || itens.length === 0) return fallback;

  const maior = Math.max(0, ...itens.map((i) => i.desconto ?? 0));

  try {
    const prompt = preencher(await carregarPrompt(), {
      destino: LABEL_DESTINO[destino],
      tomDestino: TOM_DESTINO[destino],
      data: formatarDataCivil(data),
      diaDaSemana: diaDaSemana(data),
      maiorDesconto: maior > 0 ? `${maior}%` : "(sem desconto real — não invente percentual)",
      produtos: blocoProdutos(itens),
    });

    const bruto = await gerarJson<SaidaGemini>({
      prompt,
      schema: SCHEMA,
      temperature: 0.8,
      tarefa: "curto",
      maxOutputTokens: 8192,
    });

    return mesclarComFallback(destino, data, itens, bruto);
  } catch (erro) {
    await registrar("ERRO", "VITRINE", `Gemini falhou na landing, usando template. ${erro instanceof Error ? erro.message : String(erro)}`, {
      destino,
    });
    return fallback;
  }
}
