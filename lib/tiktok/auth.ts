import { logger } from "@/lib/logging";
import { saveTikTokTokens, type TikTokTokenSet } from "./credentials";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
/**
 * ID do serviço no Partner Center (App & Service → Copy authorization link).
 * NÃO é o App Key — usar o `service_id` da URL oficial de autorização,
 * senão a página responde "This service does not exist".
 */
const SERVICE_ID = process.env.TIKTOK_SERVICE_ID;

// Domínio de autorização/token do TikTok Shop Partner API (estável entre versões).
const AUTH_BASE_URL = "https://auth.tiktok-shops.com";

interface TokenResponse {
  code: number;
  message: string;
  data?: {
    access_token: string;
    access_token_expire_in: number; // segundos até expirar
    refresh_token: string;
    refresh_token_expire_in: number;
    seller_name?: string;
    seller_base_region?: string;
  };
}

function requireCredentials() {
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET não configurados.");
  }
  return { clientKey: CLIENT_KEY, clientSecret: CLIENT_SECRET };
}

/**
 * Monta a URL para o vendedor autorizar o app no TikTok Shop.
 * O vendedor faz login, aprova os escopos e o TikTok redireciona de volta
 * para `redirectUri` com `?code=...` (spec §21 authenticate()).
 *
 * No Partner Center: App & Service → seu app → Authorization →
 * "Copy authorization link". O parâmetro `service_id` dessa URL é o valor
 * de `TIKTOK_SERVICE_ID` (diferente do App Key / TIKTOK_CLIENT_KEY).
 */
export function buildTikTokAuthorizationUrl(redirectUri: string, state?: string): string {
  requireCredentials();

  const serviceId = SERVICE_ID?.trim();
  if (!serviceId) {
    throw new Error(
      "TIKTOK_SERVICE_ID não configurado. Copie o service_id do link de autorização no Partner Center (não use o App Key).",
    );
  }

  const url = new URL("https://services.tiktokshop.com/open/authorize");
  url.searchParams.set("service_id", serviceId);
  url.searchParams.set("redirect_uri", redirectUri);
  if (state) url.searchParams.set("state", state);

  return url.toString();
}

function toTokenSet(data: NonNullable<TokenResponse["data"]>): TikTokTokenSet {
  const now = Date.now();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpireAt: now + data.access_token_expire_in * 1000,
    refreshTokenExpireAt: now + data.refresh_token_expire_in * 1000,
    sellerName: data.seller_name,
  };
}

/** Troca o `code` recebido no callback OAuth pelos tokens de acesso. */
export async function exchangeTikTokAuthCode(code: string): Promise<TikTokTokenSet> {
  const { clientKey, clientSecret } = requireCredentials();

  const url = new URL(`${AUTH_BASE_URL}/api/v2/token/get`);
  url.searchParams.set("app_key", clientKey);
  url.searchParams.set("app_secret", clientSecret);
  url.searchParams.set("auth_code", code);
  url.searchParams.set("grant_type", "authorized_code");

  const response = await fetch(url, { method: "GET" });
  const json = (await response.json()) as TokenResponse;

  if (!response.ok || !json.data) {
    logger.error("PRODUCT_SYNC", "TikTok: falha ao trocar auth_code por token", { message: json.message });
    throw new Error(`TikTok token exchange falhou: ${json.message ?? response.statusText}`);
  }

  const tokens = toTokenSet(json.data);
  await saveTikTokTokens(tokens);
  logger.info("PRODUCT_SYNC", "TikTok: conta conectada com sucesso", { seller: tokens.sellerName });

  return tokens;
}

/** Renova o access token usando o refresh token salvo. */
export async function refreshTikTokAccessToken(refreshToken: string): Promise<TikTokTokenSet> {
  const { clientKey, clientSecret } = requireCredentials();

  const url = new URL(`${AUTH_BASE_URL}/api/v2/token/refresh`);
  url.searchParams.set("app_key", clientKey);
  url.searchParams.set("app_secret", clientSecret);
  url.searchParams.set("refresh_token", refreshToken);
  url.searchParams.set("grant_type", "refresh_token");

  const response = await fetch(url, { method: "GET" });
  const json = (await response.json()) as TokenResponse;

  if (!response.ok || !json.data) {
    logger.error("PRODUCT_SYNC", "TikTok: falha ao renovar token", { message: json.message });
    throw new Error(`TikTok token refresh falhou: ${json.message ?? response.statusText}`);
  }

  const tokens = toTokenSet(json.data);
  await saveTikTokTokens(tokens);

  return tokens;
}
