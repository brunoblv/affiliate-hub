import { parseShopeeUrl, shopeeConnector } from "@/lib/connectors/shopee";
import type { RawCandidate } from "@/lib/connectors/types";
import { scoreCandidate } from "./score";

/** Busca manual na Shopee (/admin/candidatos?modo=busca): usa o mesmo conector da descoberta. */
export const PAGE_SIZE = 20;

export type SortMode = "sales" | "relevance" | "commission";

export type SearchSource =
  | { kind: "keyword"; keyword: string }
  | { kind: "category"; categoryId: number }
  | { kind: "shop"; shopId: string };

export interface Candidate {
  key: string;
  itemId: string;
  shopId: string;
  shopName: string | null;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  discountPct: number | null;
  sales: number | null;
  rating: number | null;
  commissionPct: number | null;
  score: number;
  reasons: string[];
}

export interface SearchPage {
  candidates: Candidate[];
  page: number;
  hasNextPage: boolean;
}

function toCandidate(raw: RawCandidate): Candidate {
  const score = scoreCandidate({
    salesCount: raw.salesCount,
    ratingCentis: raw.ratingCentis,
    ratingCount: raw.ratingCount,
    brandWeight: 0,
    officialStore: raw.officialStore,
    discountPct: raw.discountPct,
    commissionPct: raw.commissionPct,
    priceCents: raw.priceCents,
    hasImage: Boolean(raw.imageUrl),
  });
  const shopId = raw.externalSellerId ?? "";
  return {
    key: `${shopId}:${raw.externalListingId}`,
    itemId: raw.externalListingId,
    shopId,
    shopName: raw.sellerName,
    name: raw.title,
    imageUrl: raw.imageUrl,
    priceCents: raw.priceCents,
    discountPct: raw.discountPct,
    sales: raw.salesCount,
    rating: raw.ratingCentis !== null ? raw.ratingCentis / 100 : null,
    commissionPct: raw.commissionPct !== null ? raw.commissionPct / 100 : null,
    score: score.value,
    reasons: score.reasons,
  };
}

export async function searchShopee(source: SearchSource, sort: SortMode, page: number): Promise<SearchPage> {
  const result = await shopeeConnector.searchCandidates!({
    kind: source.kind,
    value: source.kind === "keyword" ? source.keyword : source.kind === "category" ? String(source.categoryId) : source.shopId,
    sort,
    page,
    limit: PAGE_SIZE,
  });
  return {
    candidates: result.candidates.map(toCandidate).sort((a, b) => b.score - a.score),
    page,
    hasNextPage: result.hasNextPage,
  };
}

/** Aceita o ID numérico da loja, `/shop/ID` ou a URL de um produto (que carrega o ID da loja). */
export function parseShopId(input: string): string | null {
  const text = input.trim();
  if (/^\d+$/.test(text)) return text;
  const shop = text.match(/\/shop\/(\d+)/i);
  if (shop) return shop[1];
  return parseShopeeUrl(text)?.sellerId ?? null;
}
