import { shopeeQuery, toCents, parseShopeeUrl } from "@/lib/connectors/shopee";
import { scoreCandidate } from "./score";

export const PAGE_SIZE = 20;

export type SortMode = "sales" | "relevance" | "commission";
const SORT_TYPE: Record<SortMode, number> = { relevance: 1, sales: 2, commission: 5 };

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

interface Node {
  itemId: number | string;
  shopId: number | string;
  shopName?: string | null;
  productName: string;
  imageUrl: string | null;
  priceMin: string | number;
  priceDiscountRate: number | null;
  commissionRate: string | number | null;
  sales?: number | string | null;
  ratingStar: string | number | null;
}

interface Response {
  productOfferV2: { nodes: Node[] | null; pageInfo?: { hasNextPage?: boolean } } | null;
}

const FIELDS = "itemId shopId shopName productName imageUrl priceMin priceDiscountRate commissionRate sales ratingStar";
const PAGE_INFO = "pageInfo { page limit hasNextPage }";

// Um documento por tipo de busca: declarar variável não usada quebra o resolver da Shopee
// ("got null for non-null"), então cada consulta só declara o que usa.
const QUERIES = {
  keyword: `query buscar($keyword: String, $listType: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(keyword: $keyword, listType: $listType, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${FIELDS} } ${PAGE_INFO} } }`,
  category: `query buscar($productCatId: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(productCatId: $productCatId, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${FIELDS} } ${PAGE_INFO} } }`,
  shop: `query buscar($shopId: Int64!, $listType: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(shopId: $shopId, listType: $listType, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${FIELDS} } ${PAGE_INFO} } }`,
} as const;

function toCandidate(node: Node): Candidate | null {
  const priceCents = toCents(node.priceMin);
  if (priceCents === null) return null;
  const sales = node.sales != null ? Number(node.sales) : null;
  const rating = node.ratingStar ? Number(node.ratingStar) : null;
  const discountPct = node.priceDiscountRate ? Number(node.priceDiscountRate) : null;
  const commissionPct = node.commissionRate ? Number(node.commissionRate) * 100 : null;
  const score = scoreCandidate({
    sales,
    rating,
    discountPct,
    commissionPct,
    priceCents,
    hasImage: Boolean(node.imageUrl),
  });
  return {
    key: `${node.shopId}:${node.itemId}`,
    itemId: String(node.itemId),
    shopId: String(node.shopId),
    shopName: node.shopName ?? null,
    name: node.productName,
    imageUrl: node.imageUrl,
    priceCents,
    discountPct,
    sales,
    rating,
    commissionPct,
    score: score.value,
    reasons: score.reasons,
  };
}

export async function searchShopee(source: SearchSource, sort: SortMode, page: number): Promise<SearchPage> {
  const common = { page, limit: PAGE_SIZE, sortType: SORT_TYPE[sort] };
  let query: string;
  let variables: Record<string, unknown>;
  switch (source.kind) {
    case "keyword":
      query = QUERIES.keyword;
      variables = { ...common, keyword: source.keyword, listType: 0 };
      break;
    case "category":
      query = QUERIES.category;
      variables = { ...common, productCatId: source.categoryId };
      break;
    case "shop":
      query = QUERIES.shop;
      variables = { ...common, shopId: source.shopId, listType: 0 };
      break;
  }

  const data = await shopeeQuery<Response>(query, variables);
  const candidates = (data.productOfferV2?.nodes ?? [])
    .map(toCandidate)
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => b.score - a.score);
  return { candidates, page, hasNextPage: Boolean(data.productOfferV2?.pageInfo?.hasNextPage) };
}

/** Aceita o ID numérico da loja, `/shop/ID` ou a URL de um produto (que carrega o ID da loja). */
export function parseShopId(input: string): string | null {
  const text = input.trim();
  if (/^\d+$/.test(text)) return text;
  const shop = text.match(/\/shop\/(\d+)/i);
  if (shop) return shop[1];
  return parseShopeeUrl(text)?.sellerId ?? null;
}
