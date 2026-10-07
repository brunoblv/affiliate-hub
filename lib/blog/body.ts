/**
 * Corpo do post = markdown puro com três extensões, cada uma em linha própria:
 *
 *   ![alt](/midia/2026/08/cozinha.webp)   -> imagem no meio do texto (markdown comum)
 *   [produto:sofa-retratil-3-lugares]      -> card de produto do catálogo
 *   [cta:https://meli.la/abc]              -> botão para lista/link de afiliado
 *   [cta:https://meli.la/abc|Ver a lista]  -> o mesmo, com rótulo
 *
 * Markdown de propósito: o texto continua legível e editável em qualquer lugar. Mesmo
 * formato do meu-novo-lar, então os posts migrados não precisam de conversão.
 */

export type BodyBlock =
  | { kind: "markdown"; content: string }
  | { kind: "product"; slug: string }
  | { kind: "cta"; url: string; label: string };

/**
 * O "\[" opcional cobre corpos salvos por editores que escapam um parágrafo começando
 * com "[" (mdast-util-to-markdown): o shortcode chega como "\[produto:slug]".
 */
const PRODUCT_SHORTCODE = /^\\?\[produto:([a-z0-9-]+)\]$/;
const CTA_SHORTCODE = /^\\?\[cta:((?:https:\/\/[^\s\]|]+)|(?:\/go\/[a-zA-Z0-9_-]+))(?:\|([^\]]+))?\]$/;
const DEFAULT_CTA_LABEL = "Ver a lista no Mercado Livre";

const MARKDOWN_IMAGE = /!\[[^\]]*\]\(([^)\s]+)/g;
const URL_IN_TEXT = /https?:\/\/\S+/gi;
const IMAGE_LINE = /^!\[[^\]]*\]\([^)]+\)\s*$/;

/** Encurtadores de afiliado aceitos como botão. URL crua de loja não vira botão. */
const AFFILIATE_HOSTS = ["meli.la", "s.click.aliexpress.com", "s.shopee.com.br"];

export function isAllowedCta(url: string): boolean {
  if (/^\/go\/[a-zA-Z0-9_-]+$/.test(url)) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return AFFILIATE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function splitBlocks(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let pending: string[] = [];

  const flush = () => {
    const text = pending.join("\n").trim();
    if (text) blocks.push({ kind: "markdown", content: text });
    pending = [];
  };

  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();
    const product = PRODUCT_SHORTCODE.exec(trimmed);
    if (product) {
      flush();
      blocks.push({ kind: "product", slug: product[1]! });
      continue;
    }

    const cta = CTA_SHORTCODE.exec(trimmed);
    if (cta && isAllowedCta(cta[1]!)) {
      flush();
      blocks.push({ kind: "cta", url: cta[1]!, label: cta[2]?.trim() || DEFAULT_CTA_LABEL });
      continue;
    }

    pending.push(line);
  }

  flush();
  return blocks;
}

/** Slugs de produto citados, na ordem do texto. */
export function referencedProducts(body: string): string[] {
  return splitBlocks(body).flatMap((block) => (block.kind === "product" ? [block.slug] : []));
}

/** URLs de imagem embutidas: mantém PostMedia em dia ao salvar. */
export function referencedImages(body: string): string[] {
  return [...new Set([...body.matchAll(MARKDOWN_IMAGE)].map((match) => match[1]!).filter(Boolean))];
}

/** Resumo para meta description quando o campo está vazio. */
export function autoSummary(body: string, limit = 155): string {
  const text = body
    .replace(MARKDOWN_IMAGE, "")
    .replace(/\\?\[produto:[a-z0-9-]+\]/g, "")
    .replace(/\\?\[cta:[^\]]+\]/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Ficha de produto só com o card (sem texto de verdade): a página pública ficaria vazia. */
export function isEmptyProductSheet(body: string): boolean {
  return autoSummary(body, 10_000).length < 80;
}

/**
 * Garante cada [produto:slug] em linha própria, só com slugs desta lista, e remove URL
 * crua (o card já é o CTA). Shortcode esquecido pela IA vai para o fim.
 */
export function ensureProductShortcodes(body: string, slugs: string[]): string {
  const allowed = new Set(slugs);
  let text = body.replace(/\r\n/g, "\n").replace(URL_IN_TEXT, "").trim();

  text = text.replace(/^#\s+.+\n+/, "");
  text = text.replace(/^\\?\[produto:([a-z0-9-]+)\]\s*$/gm, (_match, slug: string) => (allowed.has(slug) ? `[produto:${slug}]` : ""));

  for (const slug of slugs) {
    if (!new RegExp(`^\\[produto:${slug}\\]\\s*$`, "m").test(text)) text = `${text.trim()}\n\n[produto:${slug}]`;
  }

  return `${text.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function productLineMatcher(slug: string) {
  const pattern = new RegExp(`^\\\\?\\[produto:${slug}\\]\\s*$`);
  return (line: string) => pattern.test(line.trim());
}

/** Insere uma imagem logo antes do card do produto, se ainda não houver uma ali. */
export function insertImageBeforeProduct(body: string, slug: string, imageMarkdown: string): string {
  const lines = body.split("\n");
  const index = lines.findIndex(productLineMatcher(slug));
  if (index === -1) return body;

  let cursor = index - 1;
  while (cursor >= 0 && lines[cursor]!.trim() === "") cursor--;
  if (cursor >= 0 && IMAGE_LINE.test(lines[cursor]!.trim())) return body;

  lines.splice(index, 0, imageMarkdown, "");
  return lines.join("\n");
}

/**
 * Troca o produto de uma seção: card, imagem logo antes dele e o título "##" anterior.
 * A prosa da seção não muda (não passa pela IA de novo).
 */
export function replaceProductSection(body: string, oldSlug: string, newSlug: string, newTitle: string, newImageMarkdown: string | null): string {
  const lines = body.split("\n");
  const cardIndex = lines.findIndex(productLineMatcher(oldSlug));
  if (cardIndex === -1) return body;

  lines[cardIndex] = `[produto:${newSlug}]`;
  let insertedBefore = 0;

  let imageCursor = cardIndex - 1;
  while (imageCursor >= 0 && lines[imageCursor]!.trim() === "") imageCursor--;
  if (imageCursor >= 0 && IMAGE_LINE.test(lines[imageCursor]!.trim())) {
    if (newImageMarkdown) lines[imageCursor] = newImageMarkdown;
    else {
      lines.splice(imageCursor, 1);
      insertedBefore = -1;
    }
  } else if (newImageMarkdown) {
    lines.splice(cardIndex, 0, newImageMarkdown, "");
    insertedBefore = 2;
  }

  for (let i = cardIndex + insertedBefore; i >= 0; i--) {
    if (/^##\s+/.test(lines[i]!.trim())) {
      lines[i] = `## ${newTitle}`;
      break;
    }
  }

  return lines.join("\n");
}

/** Markdown -> texto falável para o TTS: sem shortcodes, imagens, URLs nem marcação. */
export function narrationText(title: string, body: string): string {
  const speakable = body
    .replace(/^\\?\[produto:[a-z0-9-]+\]\s*$/gm, "")
    .replace(/^\\?\[cta:[^\]]+\]\s*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>#]/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const script = cleanTitle ? `${cleanTitle}.\n\n${speakable}` : speakable;
  if (!script.replace(/\./g, "").trim()) throw new Error("O corpo do post não tem texto para narrar.");
  return script;
}
