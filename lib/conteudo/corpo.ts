/**
 * Corpo do post = markdown puro, com três extensões:
 *
 *   ![alt](/midia/2026/08/cozinha.webp)   → imagem no meio do texto
 *   [produto:sofa-retratil-3-lugares]      → card de produto, em linha própria
 *   [cta:https://meli.la/abc]              → botão para lista/link de afiliado
 *   [cta:https://meli.la/abc|Ver a lista]  → o mesmo, com rótulo
 *
 * Markdown foi escolhido de propósito: o texto continua legível e editável em
 * qualquer lugar, e uma migração futura para outro editor não perde nada. Um
 * corpo em JSON de blocos prende o conteúdo ao editor que o gerou.
 */

export type BlocoDoCorpo =
  | { tipo: "markdown"; conteudo: string }
  | { tipo: "produto"; slug: string }
  | { tipo: "cta"; url: string; rotulo: string };

/**
 * Shortcode sozinho na linha. Qualquer outra ocorrência fica como texto.
 *
 * O "\[" opcional cobre o corpo salvo pelo MDXEditor: um parágrafo que
 * começa com "[" é sempre serializado de volta como "\[..." (escape padrão
 * do mdast-util-to-markdown pra não virar um link quebrado), então o
 * shortcode chega aqui como "\[produto:slug]".
 */
const SHORTCODE_PRODUTO = /^\\?\[produto:([a-z0-9-]+)\]$/;
const SHORTCODE_CTA = /^\\?\[cta:((?:https:\/\/[^\s\]|]+)|(?:\/go\/[a-zA-Z0-9]+))(?:\|([^\]]+))?\]$/;
const ROTULO_CTA_PADRAO = "Ver a lista no Mercado Livre";

/** Imagens embutidas — usado para manter MidiaEmPost em dia. */
const IMAGEM_MARKDOWN = /!\[[^\]]*\]\(([^)\s]+)/g;
const URL_EM_TEXTO = /https?:\/\/\S+/gi;

export function separarBlocos(corpo: string): BlocoDoCorpo[] {
  const blocos: BlocoDoCorpo[] = [];
  let acumulado: string[] = [];

  const despejarMarkdown = () => {
    const texto = acumulado.join("\n").trim();
    if (texto) blocos.push({ tipo: "markdown", conteudo: texto });
    acumulado = [];
  };

  for (const linha of corpo.split("\n")) {
    const cortada = linha.trim();
    const produto = SHORTCODE_PRODUTO.exec(cortada);
    if (produto) {
      despejarMarkdown();
      blocos.push({ tipo: "produto", slug: produto[1]! });
      continue;
    }

    const cta = SHORTCODE_CTA.exec(cortada);
    if (cta) {
      const url = cta[1]!;
      if (!ctaAfiliadoPermitido(url)) {
        acumulado.push(linha);
        continue;
      }
      despejarMarkdown();
      blocos.push({ tipo: "cta", url, rotulo: cta[2]?.trim() || ROTULO_CTA_PADRAO });
      continue;
    }

    acumulado.push(linha);
  }

  despejarMarkdown();

  return blocos;
}

/** Slugs de produto referenciados no corpo, na ordem em que aparecem. */
export function produtosReferenciados(corpo: string): string[] {
  return separarBlocos(corpo)
    .filter((bloco): bloco is { tipo: "produto"; slug: string } => bloco.tipo === "produto")
    .map((bloco) => bloco.slug);
}

/** URLs de imagem embutidas no corpo — para sincronizar MidiaEmPost ao salvar. */
export function imagensReferenciadas(corpo: string): string[] {
  const urls = new Set<string>();

  for (const casamento of corpo.matchAll(IMAGEM_MARKDOWN)) {
    if (casamento[1]) urls.add(casamento[1]);
  }

  return [...urls];
}

/** Resumo automático para meta description, quando o campo estiver vazio. */
export function resumoAutomatico(corpo: string, limite = 155): string {
  const textoLimpo = corpo
    .replace(IMAGEM_MARKDOWN, "")
    .replace(/\\?\[produto:[a-z0-9-]+\]/g, "")
    .replace(/\\?\[cta:[^\]]+\]/g, "")
    .replace(/[#*_>`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (textoLimpo.length <= limite) return textoLimpo;

  const cortado = textoLimpo.slice(0, limite);
  return `${cortado.slice(0, cortado.lastIndexOf(" "))}…`;
}

/**
 * Garante cada `[produto:slug]` numa linha própria, só com slugs desta lista,
 * e remove URL crua (o card já é o CTA). Se faltar algum shortcode, acrescenta
 * no fim — o Gemini às vezes esquece ou coloca no meio do parágrafo.
 */
export function garantirShortcodesNoCorpo(corpo: string, slugs: string[]): string {
  const permitidos = new Set(slugs);
  let texto = corpo.replace(/\r\n/g, "\n").replace(URL_EM_TEXTO, "").trim();

  texto = texto.replace(/^#\s+.+\n+/, "");
  texto = texto.replace(/^\\?\[produto:([a-z0-9-]+)\]\s*$/gm, (_match, slug: string) => {
    return permitidos.has(slug) ? `[produto:${slug}]` : "";
  });

  for (const slug of slugs) {
    const jaTem = new RegExp(`^\\[produto:${slug}\\]\\s*$`, "m").test(texto);
    if (!jaTem) texto = `${texto.trim()}\n\n[produto:${slug}]`;
  }

  return `${texto.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

const LINHA_IMAGEM = /^!\[[^\]]*\]\([^)]+\)\s*$/;

/**
 * Insere uma imagem (markdown) logo antes do card do produto indicado, se
 * ainda não houver uma ali. Usado pelo LarSmart pra colocar a imagem de
 * ambiente gerada junto da seção daquele produto, sem mexer no resto do
 * corpo escrito pelo Gemini.
 */
export function inserirImagemAntesDoProduto(corpo: string, slug: string, imagemMarkdown: string): string {
  const casaLinha = (linha: string) => new RegExp(`^\\\\?\\[produto:${slug}\\]\\s*$`).test(linha.trim());
  const linhas = corpo.split("\n");
  const indice = linhas.findIndex(casaLinha);
  if (indice === -1) return corpo;

  let cursor = indice - 1;
  while (cursor >= 0 && linhas[cursor]!.trim() === "") cursor--;
  if (cursor >= 0 && LINHA_IMAGEM.test(linhas[cursor]!.trim())) return corpo;

  linhas.splice(indice, 0, imagemMarkdown, "");
  return linhas.join("\n");
}

/**
 * Troca o produto de uma seção existente: substitui a imagem de ambiente
 * (se houver, logo antes do card) e o card `[produto:slugAntigo]` por
 * `[produto:slugNovo]`, e o título do `##` imediatamente anterior por
 * `tituloNovo`. Não reescreve a prosa da seção — troca de produto não passa
 * pelo Gemini de novo, só pela imagem/card/título.
 */
export function substituirSecaoDeProduto(
  corpo: string,
  slugAntigo: string,
  slugNovo: string,
  tituloNovo: string,
  imagemMarkdownNova: string | null,
): string {
  const casaLinhaAntiga = (linha: string) => new RegExp(`^\\\\?\\[produto:${slugAntigo}\\]\\s*$`).test(linha.trim());
  const linhas = corpo.split("\n");
  const indiceCard = linhas.findIndex(casaLinhaAntiga);
  if (indiceCard === -1) return corpo;

  linhas[indiceCard] = `[produto:${slugNovo}]`;

  let cursorImagem = indiceCard - 1;
  while (cursorImagem >= 0 && linhas[cursorImagem]!.trim() === "") cursorImagem--;
  if (cursorImagem >= 0 && LINHA_IMAGEM.test(linhas[cursorImagem]!.trim())) {
    if (imagemMarkdownNova) linhas[cursorImagem] = imagemMarkdownNova;
    else linhas.splice(cursorImagem, 1);
  } else if (imagemMarkdownNova) {
    linhas.splice(indiceCard, 0, imagemMarkdownNova, "");
  }

  for (let i = indiceCard; i >= 0; i--) {
    if (/^##\s+/.test(linhas[i]!.trim())) {
      linhas[i] = `## ${tituloNovo}`;
      break;
    }
  }

  return linhas.join("\n");
}

/** Corpo só com o card (ou texto irrelevante) — a página pública da ficha fica vazia. */
export function fichaProdutoVazia(corpo: string): boolean {
  return resumoAutomatico(corpo, 10_000).length < 80;
}

/**
 * Só CTA de afiliado de verdade: encurtador meli.la (lista/item do ML) ou
 * /go/:codigo do próprio site. URL crua de loja não vira botão.
 */
export function ctaAfiliadoPermitido(url: string): boolean {
  if (/^\/go\/[a-zA-Z0-9]+$/.test(url)) return true;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "meli.la" || host.endsWith(".meli.la");
  } catch {
    return false;
  }
}
