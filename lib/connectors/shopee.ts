import { createHash } from "node:crypto";
import type { Connector, DiscoveryPage, DiscoveryQueryInput, FetchResult, OfferRef, RawCandidate } from "./types";

/**
 * Shopee Affiliate Open API (GraphQL). Notas confirmadas em uso real:
 * - assinatura SHA256(AppId + Timestamp + Payload + Secret);
 * - shopId/itemId precisam ir como Int64! e em string; `listType` precisa ter valor;
 * - a API só devolve itens que estão na vitrine de afiliados: "não encontrado" não
 *   prova que o produto saiu do ar;
 * - não informa estoque, então a disponibilidade fica como está.
 */
const API_URL = "https://open-api.affiliate.shopee.com.br/graphql";
const REQUEST_TIMEOUT_MS = 20_000;

const QUERY = /* GraphQL */ `
  query ofertaPorItem($shopId: Int64!, $itemId: Int64!, $limit: Int, $listType: Int) {
    productOfferV2(shopId: $shopId, itemId: $itemId, limit: $limit, listType: $listType) {
      nodes {
        itemId
        shopId
        productName
        shopName
        imageUrl
        priceMin
        priceMax
        priceDiscountRate
        offerLink
        sales
        ratingStar
      }
    }
  }
`;

interface Node {
  itemId: number | string;
  shopId: number | string;
  productName: string;
  shopName?: string | null;
  imageUrl: string | null;
  priceMin: string | number;
  priceMax: string | number;
  priceDiscountRate: number | null;
  offerLink: string;
  sales?: number | string | null;
  ratingStar?: string | number | null;
}

interface GraphQLResponse {
  data?: { productOfferV2: { nodes: Node[] } | null };
  errors?: { message: string }[];
}

function credentials() {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;
  return appId && secret ? { appId, secret } : null;
}

/** Erros que repetir não resolve (credencial/assinatura): falha na hora, sem backoff. */
class PermanentError extends Error {}

async function request(variables: Record<string, unknown>, query: string = QUERY): Promise<GraphQLResponse> {
  const creds = credentials();
  if (!creds) throw new PermanentError("Shopee não configurada: defina SHOPEE_APP_ID e SHOPEE_SECRET.");

  const payload = JSON.stringify({ query, variables });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha256")
    .update(`${creds.appId}${timestamp}${payload}${creds.secret}`)
    .digest("hex");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `SHA256 Credential=${creds.appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body: payload,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const json = (await response.json().catch(() => ({}))) as GraphQLResponse;
  if (response.ok && !json.errors?.length) return json;

  const message = json.errors?.map((e) => e.message).join("; ") || response.statusText || `HTTP ${response.status}`;
  if (/signature|credential|permission|unauthori[sz]ed|invalid app/i.test(message) || response.status === 401 || response.status === 403) {
    throw new PermanentError(`Shopee recusou as credenciais: ${message}`);
  }
  // "got null for non-null" é instabilidade intermitente do lado deles.
  if (message.includes("got null for non-null")) throw new Error("API da Shopee instável no momento");
  throw new Error(`Shopee API: ${message}`);
}

/** Instabilidade real da API: algumas tentativas com espera crescente antes de desistir. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 800): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (error instanceof PermanentError || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** (attempt - 1)));
    }
  }
  throw last;
}

/** Consulta livre à API de afiliados (com assinatura e tentativas). Devolve só `data`. */
export async function shopeeQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const json = await withRetry(() => request(variables, query));
  return json.data as unknown as T;
}

/** "R$ 12,34" chega como "12.34" (reais) -> 1234 centavos. Nunca ponto flutuante na conta. */
export function toCents(value: string | number): number | null {
  const [whole, fraction = ""] = String(value).trim().split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) return null;
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function parseShopeeUrl(url: string): { listingId: string; sellerId: string | null } | null {
  const text = url.trim();
  const slug = text.match(/(?:^|[-/])i\.(\d+)\.(\d+)/i);
  if (slug) return { sellerId: slug[1], listingId: slug[2] };
  const path = text.match(/\/(?:product|opaanlp)\/(\d+)\/(\d+)/i);
  if (path) return { sellerId: path[1], listingId: path[2] };
  return null;
}

async function fetchOffer(ref: OfferRef): Promise<FetchResult> {
  if (!ref.externalSellerId) {
    throw new PermanentError("Oferta sem shopId (ID da loja na Shopee).");
  }
  const json = await withRetry(() =>
    request({ shopId: ref.externalSellerId, itemId: ref.externalListingId, limit: 1, listType: 0 }),
  );

  const node = json.data?.productOfferV2?.nodes?.[0];
  if (!node) return { kind: "not_found" };
  // Confere que a resposta é mesmo do item pedido (nunca aceitar preço de outro anúncio).
  if (String(node.itemId) !== ref.externalListingId) return { kind: "not_found" };

  const priceCents = toCents(node.priceMin);
  if (priceCents === null) throw new Error(`Preço inválido devolvido pela Shopee: ${String(node.priceMin)}`);

  // priceDiscountRate é inteiro 0-100 (44 = 44% de desconto).
  const rate = node.priceDiscountRate ? Number(node.priceDiscountRate) : 0;
  const previousPriceCents = rate > 0 && rate < 100 ? Math.round(priceCents / (1 - rate / 100)) : null;

  return {
    kind: "ok",
    priceCents,
    // Esta consulta não informa pagamento, parcelamento nem frete por destino.
    commercialContext: {},
    previousPriceCents,
    availability: null,
    title: node.productName ?? null,
    sellerName: node.shopName ?? null,
    imageUrl: node.imageUrl ?? null,
    affiliateUrl: node.offerLink || null,
    observedAt: new Date(),
    ...shopeeMetrics(node),
  };
}

/** Vendas e nota da própria loja, no mesmo request do preço (A.10). Nunca estimados. */
function shopeeMetrics(node: { sales?: number | string | null; ratingStar?: string | number | null }) {
  const sales = node.sales != null && node.sales !== "" ? Number(node.sales) : null;
  const stars = node.ratingStar ? Number(node.ratingStar) : null;
  return {
    salesCount: sales !== null && Number.isFinite(sales) && sales >= 0 ? Math.round(sales) : null,
    ratingCentis: stars !== null && Number.isFinite(stars) && stars > 0 && stars <= 5 ? Math.round(stars * 100) : null,
  };
}

// ---------------------------------------------------------------------------
// Descoberta (RF-16)
// ---------------------------------------------------------------------------

const SEARCH_FIELDS =
  "itemId shopId shopName productName imageUrl priceMin priceDiscountRate commissionRate sales ratingStar";
const PAGE_INFO = "pageInfo { page limit hasNextPage }";
const SORT_TYPE = { relevance: 1, sales: 2, commission: 5, discount: 1 } as const;

// Um documento por tipo de busca: declarar variável não usada quebra o resolver da Shopee
// ("got null for non-null"), então cada consulta só declara o que usa.
const SEARCH_QUERIES = {
  keyword: `query buscar($keyword: String, $listType: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(keyword: $keyword, listType: $listType, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${SEARCH_FIELDS} } ${PAGE_INFO} } }`,
  category: `query buscar($productCatId: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(productCatId: $productCatId, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${SEARCH_FIELDS} } ${PAGE_INFO} } }`,
  shop: `query buscar($shopId: Int64!, $listType: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(shopId: $shopId, listType: $listType, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${SEARCH_FIELDS} } ${PAGE_INFO} } }`,
  hot: `query buscar($listType: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(listType: $listType, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${SEARCH_FIELDS} } ${PAGE_INFO} } }`,
} as const;

interface SearchNode extends Node {
  commissionRate?: string | number | null;
}

interface SearchResponse {
  productOfferV2?: { nodes: SearchNode[] | null; pageInfo?: { hasNextPage?: boolean } } | null;
}

export function toRawCandidate(node: SearchNode, observedAt = new Date()): RawCandidate | null {
  const priceCents = toCents(node.priceMin);
  if (priceCents === null) return null;
  const rate = node.priceDiscountRate ? Number(node.priceDiscountRate) : 0;
  const commission = node.commissionRate ? Number(node.commissionRate) : 0;
  const metrics = shopeeMetrics(node);
  return {
    externalListingId: String(node.itemId),
    externalSellerId: String(node.shopId),
    sellerName: node.shopName ?? null,
    // O schema público não traz marcador de loja oficial: fica desconhecido, nunca presumido.
    officialStore: null,
    title: node.productName,
    imageUrl: node.imageUrl,
    priceCents,
    previousPriceCents: rate > 0 && rate < 100 ? Math.round(priceCents / (1 - rate / 100)) : null,
    salesCount: metrics.salesCount,
    ratingCentis: metrics.ratingCentis,
    ratingCount: null,
    commissionPct: commission > 0 ? Math.round(commission * 10_000) : null,
    discountPct: rate > 0 ? rate : null,
    categoryPath: [],
    observedAt,
  };
}

async function searchCandidates(input: DiscoveryQueryInput): Promise<DiscoveryPage> {
  const common = { page: input.page, limit: input.limit, sortType: SORT_TYPE[input.sort] };
  let query: string;
  let variables: Record<string, unknown>;
  switch (input.kind) {
    case "keyword":
      query = SEARCH_QUERIES.keyword;
      variables = { ...common, keyword: input.value ?? "", listType: 0 };
      break;
    case "category":
      query = SEARCH_QUERIES.category;
      variables = { ...common, productCatId: Number(input.value) };
      break;
    case "shop":
      query = SEARCH_QUERIES.shop;
      variables = { ...common, shopId: input.value ?? "", listType: 0 };
      break;
    case "hot":
      query = SEARCH_QUERIES.hot;
      variables = { ...common, listType: 0 };
      break;
    default:
      throw new Error(`A Shopee não tem pauta do tipo "${input.kind}".`);
  }
  const data = await shopeeQuery<SearchResponse>(query, variables);
  const now = new Date();
  const candidates = (data.productOfferV2?.nodes ?? [])
    .map((node) => toRawCandidate(node, now))
    .filter((c): c is RawCandidate => c !== null);
  return { candidates, page: input.page, hasNextPage: Boolean(data.productOfferV2?.pageInfo?.hasNextPage) };
}

export const shopeeConnector: Connector = {
  key: "shopee",
  label: "Shopee (API de afiliados)",
  capabilities: { fetchPrice: true, fetchAvailability: false, affiliateLink: true, discovery: true },
  // Limite não documentado: conservador (a produção do meu-novo-lar usa 5 req/s).
  limits: { concurrency: 2, minIntervalMs: 400 },
  isConfigured: () => credentials() !== null,
  parseUrl: parseShopeeUrl,
  fetchOffer,
  searchCandidates,
};
