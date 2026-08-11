import { toCsv } from "@/lib/csv";
import { getSiteUrl } from "@/lib/site-url";

/** Colunas oficiais do bulk upload do Pinterest (sample CSV). */
export const PINTEREST_BULK_HEADERS = [
  "Title",
  "Media URL",
  "Pinterest board",
  "Thumbnail",
  "Description",
  "Link",
  "Publish date",
  "Keywords",
] as const;

export type PinterestBulkHeader = (typeof PINTEREST_BULK_HEADERS)[number];

export interface PinterestExportProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  price: number;
  originalPrice: number | null;
  brand: string | null;
  categoryName: string | null;
  /** shortCode de AffiliateLink, se existir — vira Link rastreado /go/:code */
  trackingShortCode: string | null;
  /** Fallback se não houver shortCode */
  affiliateOrProductUrl: string | null;
}

export interface BuildPinterestCsvOptions {
  board: string;
  /** ISO YYYY-MM-DDTHH:MM:SS — vazio = publicar agora */
  publishDate?: string;
  siteUrl?: string;
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function clip(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function uniqueTitle(name: string, id: string, used: Set<string>): string {
  let base = clip(name, 100);
  if (!used.has(base.toLowerCase())) {
    used.add(base.toLowerCase());
    return base;
  }
  const suffix = ` · ${id.slice(-6)}`;
  base = clip(name, 100 - suffix.length) + suffix;
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const extra = ` · ${i}`;
    candidate = clip(name, 100 - suffix.length - extra.length) + suffix + extra;
    i += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function buildDescription(product: PinterestExportProduct): string {
  const parts: string[] = [];
  if (product.description) parts.push(product.description);
  if (product.price > 0) {
    const priceLine =
      product.originalPrice && product.originalPrice > product.price
        ? `De ${formatMoney(product.originalPrice)} por ${formatMoney(product.price)}`
        : `Por ${formatMoney(product.price)}`;
    parts.push(priceLine);
  }
  parts.push("Confira o link e aproveite!");
  return clip(parts.join(" — "), 500);
}

function buildKeywords(product: PinterestExportProduct): string {
  const tags = [product.categoryName, product.brand, "oferta", "achadinhos", "promoção"].filter(
    (t): t is string => Boolean(t && t.trim()),
  );
  // Pinterest: lista separada por vírgula
  return [...new Set(tags.map((t) => t.trim().toLowerCase()))].join(", ");
}

function resolveLink(product: PinterestExportProduct, siteUrl: string): string {
  if (product.trackingShortCode) {
    return `${siteUrl}/go/${product.trackingShortCode}`;
  }
  return product.affiliateOrProductUrl ?? product.productUrl ?? "";
}

/**
 * Monta o CSV no formato do bulk upload do Pinterest.
 * Só inclui produtos com imageUrl pública (obrigatório em Media URL).
 */
export function buildPinterestBulkCsv(
  products: PinterestExportProduct[],
  options: BuildPinterestCsvOptions,
): { csv: string; exported: number; skipped: number } {
  const board = options.board.trim();
  if (!board) throw new Error("Informe o nome do board do Pinterest.");

  const siteUrl = (options.siteUrl ?? getSiteUrl()).replace(/\/$/, "");
  const usedTitles = new Set<string>();
  const rows: Array<Record<string, string>> = [];
  let skipped = 0;

  for (const product of products) {
    const mediaUrl = product.imageUrl?.trim() ?? "";
    if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
      skipped += 1;
      continue;
    }

    const link = resolveLink(product, siteUrl);
    rows.push({
      Title: uniqueTitle(product.name, product.id, usedTitles),
      "Media URL": mediaUrl,
      "Pinterest board": board,
      Thumbnail: "",
      Description: buildDescription(product),
      Link: link,
      "Publish date": options.publishDate?.trim() ?? "",
      Keywords: buildKeywords(product),
    });
  }

  return {
    csv: toCsv([...PINTEREST_BULK_HEADERS], rows),
    exported: rows.length,
    skipped,
  };
}
