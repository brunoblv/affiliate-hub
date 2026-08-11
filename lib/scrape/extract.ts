export interface ScrapedProductData {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  raw: Record<string, unknown>;
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const cleaned = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickJsonLdProduct(documents: unknown[]): Record<string, unknown> | null {
  for (const doc of documents) {
    if (!doc || typeof doc !== "object") continue;
    const item = doc as Record<string, unknown>;
    const type = item["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return item;
    if (Array.isArray(item["@graph"])) {
      const nested = pickJsonLdProduct(item["@graph"] as unknown[]);
      if (nested) return nested;
    }
  }
  return null;
}

function priceFromOffers(offers: unknown): { price?: number; originalPrice?: number; currency?: string } {
  if (!offers) return {};
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const o = offer as Record<string, unknown>;
    const price = parsePrice(o.price ?? o.lowPrice);
    const originalPrice = parsePrice(o.highPrice);
    const currency = typeof o.priceCurrency === "string" ? o.priceCurrency : undefined;
    if (price !== undefined) return { price, originalPrice, currency };
  }
  return {};
}

/** Extrai dados de produto a partir do HTML (JSON-LD, Open Graph e heurísticas). */
export function extractProductFromHtml(html: string, pageUrl: string): ScrapedProductData {
  const jsonLdDocs: unknown[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      jsonLdDocs.push(JSON.parse(match[1]!));
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }

  const productLd = pickJsonLdProduct(jsonLdDocs);
  const offers = productLd ? priceFromOffers(productLd.offers) : {};

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  const ogDescription =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];
  const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

  const priceMatches = [...html.matchAll(/R\$\s*([\d.]+,?[\d]*)/gi)]
    .map((m) => parsePrice(m[1]))
    .filter((n): n is number => n !== undefined && n > 0)
    .sort((a, b) => a - b);

  const name =
    firstString(productLd?.name, ogTitle, titleTag)?.replace(/\s+/g, " ").trim() ||
    `Produto importado ${new URL(pageUrl).hostname}`;

  const imageFromLd = productLd?.image;
  const imageUrl = firstString(
    Array.isArray(imageFromLd) ? imageFromLd[0] : imageFromLd,
    ogImage,
  );

  const price = offers.price ?? priceMatches[0] ?? 0;
  const originalPrice =
    offers.originalPrice && offers.originalPrice > price
      ? offers.originalPrice
      : priceMatches.length > 1
        ? priceMatches[priceMatches.length - 1]
        : undefined;

  return {
    name: name.slice(0, 500),
    description: firstString(productLd?.description, ogDescription, metaDescription)?.slice(0, 5000),
    imageUrl,
    price,
    originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
    currency: offers.currency ?? "BRL",
    raw: {
      pageUrl,
      jsonLd: productLd ?? null,
      ogTitle,
      ogImage,
      priceSamples: priceMatches.slice(0, 8),
    },
  };
}

export function isScrapedProductIncomplete(data: {
  name: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  categoryId?: string | null;
}): boolean {
  const placeholderName = /^produto importado/i.test(data.name);
  return placeholderName || data.price <= 0 || !data.imageUrl || !data.description || !data.categoryId;
}
