import { createHash } from "node:crypto";
import type { Connector, FetchResult, OfferRef } from "./types";

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
    previousPriceCents,
    availability: null,
    title: node.productName ?? null,
    sellerName: node.shopName ?? null,
    imageUrl: node.imageUrl ?? null,
    affiliateUrl: node.offerLink || null,
    observedAt: new Date(),
  };
}

export const shopeeConnector: Connector = {
  key: "shopee",
  label: "Shopee (API de afiliados)",
  capabilities: { fetchPrice: true, fetchAvailability: false, affiliateLink: true },
  // Limite não documentado: conservador (a produção do meu-novo-lar usa 5 req/s).
  limits: { concurrency: 2, minIntervalMs: 400 },
  isConfigured: () => credentials() !== null,
  parseUrl: parseShopeeUrl,
  fetchOffer,
};
