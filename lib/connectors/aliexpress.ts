import { createHmac } from "node:crypto";
import { safeFetch } from "@/lib/net/safe-fetch";
import { toCents } from "./shopee";
import type { Connector, DiscoveryPage, DiscoveryQueryInput, FetchResult, OfferRef, RawCandidate } from "./types";

/**
 * AliExpress — Affiliate API do Open Platform (gateway IOP, `aliexpress.affiliate.productdetail.get`).
 * - assinatura HMAC-SHA256(secret, parâmetros ordenados como chave+valor), hex maiúsculo;
 * - preço já convertido para BRL com `target_currency`; o link de afiliado (promotion_link) só
 *   vem quando há `tracking_id`;
 * - só devolve itens com programa de afiliados ativo: "não encontrado" não prova que saiu do ar;
 * - não informa estoque nem descrição: o texto da página vem do material colado no admin;
 * - o "listingId" é o ID do item (1005...); o vendedor não é necessário para consultar.
 */
const API_URL = "https://api-sg.aliexpress.com/sync";
const REQUEST_TIMEOUT_MS = 20_000;

class PermanentError extends Error {}

function credentials() {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const secret = process.env.ALIEXPRESS_APP_SECRET;
  return appKey && secret ? { appKey, secret, trackingId: process.env.ALIEXPRESS_TRACKING_ID || null } : null;
}

export function signAliExpress(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return createHmac("sha256", secret).update(base, "utf8").digest("hex").toUpperCase();
}

interface ProductNode {
  product_id: number | string;
  product_title?: string;
  product_main_image_url?: string;
  product_small_image_urls?: { string?: string[] };
  target_sale_price?: string;
  target_original_price?: string;
  target_sale_price_currency?: string;
  shop_name?: string;
  promotion_link?: string;
  /** Campos da busca (product.query / hotproduct.query), ausentes no detalhe. */
  lastest_volume?: number | string;
  evaluate_rate?: string;
  commission_rate?: string;
  discount?: string;
  first_level_category_name?: string;
  second_level_category_name?: string;
}

type SearchResponse = DetailResponse & Record<string, unknown>;

interface DetailResponse {
  aliexpress_affiliate_productdetail_get_response?: {
    resp_result?: {
      resp_code?: number;
      resp_msg?: string;
      result?: { products?: { product?: ProductNode[] } };
    };
  };
  error_response?: { code?: string; msg?: string };
  code?: string;
  message?: string;
}

async function request(method: string, business: Record<string, string>): Promise<SearchResponse> {
  const creds = credentials();
  if (!creds) throw new PermanentError("AliExpress não configurado: defina ALIEXPRESS_APP_KEY e ALIEXPRESS_APP_SECRET.");

  const params: Record<string, string> = {
    app_key: creds.appKey,
    method,
    sign_method: "sha256",
    timestamp: String(Date.now()),
    ...business,
  };
  if (creds.trackingId) params.tracking_id = creds.trackingId;
  params.sign = signAliExpress(params, creds.secret);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json().catch(() => ({}))) as SearchResponse;

  const code = json.error_response?.code ?? json.code;
  if (response.ok && (!code || code === "0")) return json;
  const message = json.error_response?.msg ?? json.message ?? response.statusText ?? `HTTP ${response.status}`;
  if (/sign|app_?key|permission|unauthori[sz]ed|forbidden|invalid/i.test(`${code} ${message}`) || response.status === 401 || response.status === 403) {
    throw new PermanentError(`AliExpress recusou as credenciais: ${code ?? ""} ${message}`.trim());
  }
  throw new Error(`AliExpress API: ${code ?? response.status} ${message}`);
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

/** `.../item/1005012631924049.html` (qualquer subdomínio aliexpress.*) ou o ID cru. */
export function parseAliExpressUrl(input: string): { listingId: string; sellerId: string | null } | null {
  const text = input.trim();
  const raw = text.match(/^(\d{10,20})$/);
  if (raw) return { listingId: raw[1], sellerId: null };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!/(^|\.)aliexpress\.(com|us|ru)(\.[a-z]{2})?$/i.test(url.hostname)) return null;
  const item = url.pathname.match(/\/item\/(?:[^/]*\/)?(\d{10,20})\.html/i);
  return item ? { listingId: item[1], sellerId: null } : null;
}

const SHORT_HOSTS = /^(s\.click\.aliexpress\.com|a\.aliexpress\.com|click\.aliexpress\.com)$/i;

/** Link curto de afiliado (s.click.aliexpress.com/e/...): segue o redirecionamento até a página do item. */
export async function resolveAliExpressShortUrl(input: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (!SHORT_HOSTS.test(url.hostname)) return null;
  const response = await safeFetch(url.toString(), {
    maxRedirects: 4,
    stopAfterBytes: 1024,
    timeoutMs: 10_000,
    headers: { "user-agent": "Mozilla/5.0 (compatible; affiliate-hub)" },
  });
  if (!parseAliExpressUrl(response.finalUrl)) return null;
  // Sem os parâmetros de rastreio do clique (mudam a cada redirecionamento).
  const final = new URL(response.finalUrl);
  return `${final.origin}${final.pathname}`;
}

async function fetchOffer(ref: OfferRef): Promise<FetchResult> {
  const json = await withRetry(() =>
    request("aliexpress.affiliate.productdetail.get", {
      product_ids: ref.externalListingId,
      target_currency: "BRL",
      target_language: "PT",
      country: "BR",
    }),
  );

  const result = json.aliexpress_affiliate_productdetail_get_response?.resp_result;
  const node = result?.result?.products?.product?.[0];
  if (!node || String(node.product_id) !== ref.externalListingId) return { kind: "not_found" };
  if (node.target_sale_price_currency && node.target_sale_price_currency !== "BRL") {
    throw new Error(`AliExpress devolveu preço em ${node.target_sale_price_currency}, não em BRL.`);
  }

  const priceCents = node.target_sale_price ? toCents(node.target_sale_price) : null;
  if (priceCents === null) throw new Error(`Preço inválido devolvido pelo AliExpress: ${String(node.target_sale_price)}`);
  const original = node.target_original_price ? toCents(node.target_original_price) : null;

  const images = [node.product_main_image_url, ...(node.product_small_image_urls?.string ?? [])]
    .filter((image): image is string => Boolean(image))
    .filter((image, index, list) => list.indexOf(image) === index);

  return {
    kind: "ok",
    priceCents,
    // Frete e impostos de importação dependem do CEP e do valor do carrinho.
    commercialContext: {},
    previousPriceCents: original && original > priceCents ? original : null,
    availability: null,
    title: node.product_title ?? null,
    sellerName: node.shop_name ?? null,
    imageUrl: images[0] ?? null,
    imageUrls: images,
    affiliateUrl: node.promotion_link || null,
    observedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Descoberta (RF-16): product.query e hotproduct.query
// ---------------------------------------------------------------------------

const SORT = {
  sales: "LAST_VOLUME_DESC",
  relevance: undefined,
  // A API não ordena por comissão nem desconto: a ordenação final é nossa (score).
  commission: "LAST_VOLUME_DESC",
  discount: "LAST_VOLUME_DESC",
} as const;

/** "8.0%" ou "8.0" -> 8 (ponto percentual); null quando não é número. */
function percent(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace("%", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function toRawCandidate(node: ProductNode, observedAt = new Date()): RawCandidate | null {
  if (node.target_sale_price_currency && node.target_sale_price_currency !== "BRL") return null;
  const priceCents = node.target_sale_price ? toCents(node.target_sale_price) : null;
  if (priceCents === null || !node.product_title) return null;
  const original = node.target_original_price ? toCents(node.target_original_price) : null;
  const volume = node.lastest_volume !== undefined ? Number(node.lastest_volume) : null;
  const commission = percent(node.commission_rate);
  const discount = percent(node.discount);
  return {
    externalListingId: String(node.product_id),
    externalSellerId: null,
    sellerName: node.shop_name ?? null,
    officialStore: null,
    title: node.product_title,
    imageUrl: node.product_main_image_url ?? null,
    priceCents,
    previousPriceCents: original && original > priceCents ? original : null,
    // Vendas dos últimos 30 dias, como informa a API.
    salesCount: volume !== null && Number.isFinite(volume) && volume >= 0 ? Math.round(volume) : null,
    // evaluate_rate é % de avaliações positivas, não nota em estrelas: não é convertido
    // (seria inventar uma nota). Fica sem nota; vendas e comissão sustentam o score.
    ratingCentis: null,
    ratingCount: null,
    commissionPct: commission !== null && commission > 0 ? Math.round(commission * 100) : null,
    discountPct: discount !== null && discount > 0 ? discount : null,
    categoryPath: [node.first_level_category_name, node.second_level_category_name].filter((c): c is string => Boolean(c)),
    observedAt,
  };
}

async function searchCandidates(input: DiscoveryQueryInput): Promise<DiscoveryPage> {
  const business: Record<string, string> = {
    target_currency: "BRL",
    target_language: "PT",
    ship_to_country: "BR",
    page_no: String(input.page),
    page_size: String(Math.min(50, input.limit)),
  };
  let method: string;
  let key: string;
  switch (input.kind) {
    case "keyword":
    case "category": {
      method = "aliexpress.affiliate.product.query";
      key = "aliexpress_affiliate_product_query_response";
      if (input.kind === "keyword") business.keywords = input.value ?? "";
      else business.category_ids = input.value ?? "";
      const sort = SORT[input.sort];
      if (sort) business.sort = sort;
      break;
    }
    case "hot":
      method = "aliexpress.affiliate.hotproduct.query";
      key = "aliexpress_affiliate_hotproduct_query_response";
      if (input.value) business.keywords = input.value;
      break;
    case "promo":
      method = "aliexpress.affiliate.featuredpromo.products.get";
      key = "aliexpress_affiliate_featuredpromo_products_get_response";
      if (input.value) business.promotion_name = input.value;
      break;
    default:
      throw new Error(`O AliExpress não tem pauta do tipo "${input.kind}".`);
  }

  const json = await withRetry(() => request(method, business));
  const result = (json[key] as { resp_result?: { result?: { products?: { product?: ProductNode[] }; current_page_no?: number; total_page_no?: number } } } | undefined)
    ?.resp_result?.result;
  const now = new Date();
  const candidates = (result?.products?.product ?? [])
    .map((node) => toRawCandidate(node, now))
    .filter((c): c is RawCandidate => c !== null);
  const hasNextPage = result?.total_page_no !== undefined && (result.current_page_no ?? input.page) < result.total_page_no;
  return { candidates, page: input.page, hasNextPage };
}

export const aliExpressConnector: Connector = {
  key: "aliexpress",
  label: "AliExpress (API de afiliados)",
  capabilities: { fetchPrice: true, fetchAvailability: false, affiliateLink: true, discovery: true },
  limits: { concurrency: 2, minIntervalMs: 500 },
  isConfigured: () => credentials() !== null,
  requiresSellerId: false,
  parseUrl: parseAliExpressUrl,
  resolveShortUrl: resolveAliExpressShortUrl,
  fetchOffer,
  searchCandidates,
};
