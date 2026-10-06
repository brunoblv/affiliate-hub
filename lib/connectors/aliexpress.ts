import { createHmac } from "node:crypto";
import { safeFetch } from "@/lib/net/safe-fetch";
import { toCents } from "./shopee";
import type { Connector, FetchResult, OfferRef } from "./types";

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
}

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

async function request(method: string, business: Record<string, string>): Promise<DetailResponse> {
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
  const json = (await response.json().catch(() => ({}))) as DetailResponse;

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

export const aliExpressConnector: Connector = {
  key: "aliexpress",
  label: "AliExpress (API de afiliados)",
  capabilities: { fetchPrice: true, fetchAvailability: false, affiliateLink: true },
  limits: { concurrency: 2, minIntervalMs: 500 },
  isConfigured: () => credentials() !== null,
  requiresSellerId: false,
  parseUrl: parseAliExpressUrl,
  resolveShortUrl: resolveAliExpressShortUrl,
  fetchOffer,
};
