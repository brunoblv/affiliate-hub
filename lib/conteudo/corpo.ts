/**
 * Corpo do post = markdown puro, com duas extensões:
 *
 *   ![alt](/midia/2026/08/cozinha.webp)   → imagem no meio do texto
 *   [produto:sofa-retratil-3-lugares]      → card de produto, em linha própria
 *
 * Markdown foi escolhido de propósito: o texto continua legível e editável em
 * qualquer lugar, e uma migração futura para outro editor não perde nada. Um
 * corpo em JSON de blocos prende o conteúdo ao editor que o gerou.
 */

export type BlocoDoCorpo = { tipo: "markdown"; conteudo: string } | { tipo: "produto"; slug: string };

/**
 * Shortcode sozinho na linha. Qualquer outra ocorrência fica como texto.
 *
 * O "\[" opcional cobre o corpo salvo pelo MDXEditor: um parágrafo que
 * começa com "[" é sempre serializado de volta como "\[..." (escape padrão
 * do mdast-util-to-markdown pra não virar um link quebrado), então o
 * shortcode chega aqui como "\[produto:slug]".
 */
const SHORTCODE_PRODUTO = /^\\?\[produto:([a-z0-9-]+)\]$/;

/** Imagens embutidas — usado para manter MidiaEmPost em dia. */
const IMAGEM_MARKDOWN = /!\[[^\]]*\]\(([^)\s]+)/g;

export function separarBlocos(corpo: string): BlocoDoCorpo[] {
  const blocos: BlocoDoCorpo[] = [];
  let acumulado: string[] = [];

  const despejarMarkdown = () => {
    const texto = acumulado.join("\n").trim();
    if (texto) blocos.push({ tipo: "markdown", conteudo: texto });
    acumulado = [];
  };

  for (const linha of corpo.split("\n")) {
    const casamento = SHORTCODE_PRODUTO.exec(linha.trim());

    if (casamento) {
      despejarMarkdown();
      blocos.push({ tipo: "produto", slug: casamento[1]! });
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
    .replace(/[#*_>`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (textoLimpo.length <= limite) return textoLimpo;

  const cortado = textoLimpo.slice(0, limite);
  return `${cortado.slice(0, cortado.lastIndexOf(" "))}…`;
}

/** Corpo só com o card (ou texto irrelevante) — a página pública da ficha fica vazia. */
export function fichaProdutoVazia(corpo: string): boolean {
  return resumoAutomatico(corpo, 10_000).length < 80;
}
