import type { Connector, FetchResult, OfferRef } from "./types";

/**
 * Mercado Livre — API de Catálogo. Notas confirmadas em uso real:
 * - `/items/{id}` devolve 403 para anúncio de vendedor de fora da conta; o que funciona para
 *   qualquer produto é o catálogo: `/products/{id}` (nome, fotos) e `/products/{id}/items`
 *   (anúncios que disputam a buy box, com preço, preço original, vendedor e frete);
 * - basta o token do próprio app (client_credentials): não precisa conectar conta de usuário;
 * - não existe API de link de afiliado: o link (meli.la/...) é colado à mão no cadastro;
 * - o "listingId" desta oferta é o ID do produto de catálogo (MLB123...), não de um anúncio:
 *   a oferta acompanha a buy box, cujo anúncio vencedor pode mudar.
 */
const API_BASE = "https://api.mercadolibre.com";
const REQUEST_TIMEOUT_MS = 20_000;

class PermanentError extends Error {}

function credentials() {
  const clientId = process.env.MERCADOLIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) return cachedToken.value;
  const creds = credentials();
  if (!creds) {
    throw new PermanentError("Mercado Livre não configurado: defina MERCADOLIVRE_CLIENT_ID e MERCADOLIVRE_CLIENT_SECRET.");
  }
  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; message?: string };
  if (!response.ok || !json.access_token) {
    throw new PermanentError(`Mercado Livre recusou as credenciais: ${json.message ?? response.statusText}`);
  }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

/** GET autenticado (exportado para a busca de correspondências). */
export { get as mercadoLivreGet };

// A API limita a taxa por app (429 "local_rate_limited"): todas as chamadas saem em fila, com intervalo mínimo.
const MIN_GAP_MS = 350;
let queue: Promise<void> = Promise.resolve();
function throttle(): Promise<void> {
  const turn = queue.then(() => new Promise<void>((resolve) => setTimeout(resolve, MIN_GAP_MS)));
  queue = turn;
  return turn;
}

/** GET autenticado. `null` = 404 (o recurso não existe); demais falhas lançam erro (nova tentativa). */
async function get<T>(path: string): Promise<T | null> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await throttle();
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { authorization: `Bearer ${await accessToken()}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 404) return null;
    if (response.status === 401) {
      cachedToken = null; // token expirou antes do previsto: renova e repete
      continue;
    }
    if (response.ok) return (await response.json()) as T;
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      continue;
    }
    if (response.status === 403) throw new PermanentError(`Mercado Livre negou ${path}: ${body.message ?? "forbidden"}`);
    if (attempt >= 3) throw new Error(`Mercado Livre API ${response.status} em ${path}: ${body.message ?? response.statusText}`);
    await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** (attempt - 1)));
  }
  throw new Error(`Mercado Livre: sessão expirou repetidamente em ${path}`);
}

/**
 * Aceita a URL de uma página de catálogo (`.../nome/p/MLB123`) ou o ID cru. Links de anúncio
 * (`MLB-123-titulo`) não servem: o anúncio individual é bloqueado pela API.
 */
export function parseMercadoLivreUrl(input: string): { listingId: string; sellerId: string | null } | null {
  const text = input.trim();
  const raw = text.match(/^(MLB\d+)$/i);
  if (raw) return { listingId: raw[1].toUpperCase(), sellerId: null };
  const catalog = text.match(/\/p\/(MLB\d+)/i) ?? text.match(/-p\/(MLB\d+)/i);
  if (catalog && /mercadolivre|mercadolibre/i.test(text)) return { listingId: catalog[1].toUpperCase(), sellerId: null };
  return null;
}

interface CatalogItem {
  item_id: string;
  seller_id: number;
  price: number;
  original_price: number | null;
  condition?: string;
}

/** "143.91" (reais, número) -> 14391 centavos. Nunca ponto flutuante na conta. */
function toCents(value: number): number | null {
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

async function fetchOffer(ref: OfferRef): Promise<FetchResult> {
  const catalogId = ref.externalListingId;
  const items = await get<{ results?: CatalogItem[] }>(`/products/${catalogId}/items`);
  // Vencedor da buy box = primeiro anúncio novo; usados não representam o preço do produto.
  const winner = items?.results?.find((item) => (item.condition ?? "new") === "new");
  if (!winner) return { kind: "not_found" };

  const priceCents = toCents(winner.price);
  if (priceCents === null) throw new Error(`Preço inválido devolvido pelo Mercado Livre: ${winner.price}`);
  const original = winner.original_price ? toCents(winner.original_price) : null;

  // Nome, foto e vendedor são complementares: se falharem, o preço ainda vale.
  const [product, seller] = await Promise.all([
    get<{ name?: string; pictures?: { url: string }[] }>(`/products/${catalogId}`).catch(() => null),
    get<{ nickname?: string }>(`/users/${winner.seller_id}`).catch(() => null),
  ]);

  return {
    kind: "ok",
    priceCents,
    previousPriceCents: original && original > priceCents ? original : null,
    availability: "IN_STOCK",
    title: product?.name ?? null,
    sellerName: seller?.nickname ?? null,
    imageUrl: product?.pictures?.[0]?.url ?? null,
    affiliateUrl: null,
    observedAt: new Date(),
  };
}

export const mercadoLivreConnector: Connector = {
  key: "mercadolivre",
  label: "Mercado Livre (API de catálogo)",
  capabilities: { fetchPrice: true, fetchAvailability: true, affiliateLink: false },
  limits: { concurrency: 2, minIntervalMs: 400 },
  isConfigured: () => credentials() !== null,
  requiresSellerId: false,
  parseUrl: parseMercadoLivreUrl,
  fetchOffer,
};
