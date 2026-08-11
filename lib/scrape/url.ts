import { createHash } from "crypto";
import { Platform } from "@/lib/generated/prisma/client";

export function normalizeProductUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  try {
    const url = new URL(trimmed);
    if (!/^https?:$/i.test(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function parseUrlsFromText(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const url = normalizeProductUrl(line);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function detectPlatformFromUrl(url: string): Platform {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("tiktok")) return Platform.TIKTOK_SHOP;
  if (host.includes("shopee")) return Platform.SHOPEE;
  if (host.includes("mercadolivre") || host.includes("mercadolibre")) return Platform.MERCADO_LIVRE;
  if (host.includes("amazon")) return Platform.AMAZON;
  if (host.includes("aliexpress")) return Platform.ALIEXPRESS;
  if (host.includes("magazineluiza") || host.includes("magalu")) return Platform.MAGALU;
  return Platform.OUTRAS;
}

/** Extrai um ID estável da URL; se não achar, usa hash da URL canônica. */
export function extractExternalId(url: string, platform: Platform): string {
  const parsed = new URL(url);
  const path = parsed.pathname;

  if (platform === Platform.TIKTOK_SHOP) {
    const productMatch =
      path.match(/\/product\/(\d+)/i) ||
      path.match(/\/view\/product\/(\d+)/i) ||
      path.match(/\/pdp\/[^/]+\/(\d+)/i);
    if (productMatch?.[1]) return productMatch[1];

    const queryId = parsed.searchParams.get("product_id") ?? parsed.searchParams.get("id");
    if (queryId && /^\d+$/.test(queryId)) return queryId;
  }

  if (platform === Platform.SHOPEE) {
    const shopee = path.match(/\.(\d+)$/) || path.match(/\/product\/\d+\/(\d+)/);
    if (shopee?.[1]) return shopee[1];
  }

  if (platform === Platform.MERCADO_LIVRE) {
    const mlb = path.match(/MLB-?(\d+)/i) || parsed.searchParams.get("id");
    if (mlb) return typeof mlb === "string" && mlb.startsWith("MLB") ? mlb : `MLB${mlb}`;
  }

  return createHash("sha256").update(url).digest("hex").slice(0, 24);
}
