import { signRequest } from "./sign";
import { getTikTokTokens, saveTikTokTokens } from "./credentials";
import { refreshTikTokAccessToken } from "./auth";
import { logger } from "@/lib/logging";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

// Domínio das chamadas de API do TikTok Shop Open API (fora de auth/token).
const API_BASE_URL = "https://open-api.tiktokglobalshop.com";

async function getValidAccessToken(): Promise<{ accessToken: string; shopCipher?: string }> {
  const tokens = await getTikTokTokens();
  if (!tokens) {
    throw new Error("TikTok Shop não conectado. Autorize o app em /admin/integrations antes de chamar a API.");
  }

  const expiresInLessThan5Min = tokens.accessTokenExpireAt - Date.now() < 5 * 60 * 1000;
  if (!expiresInLessThan5Min) {
    return { accessToken: tokens.accessToken, shopCipher: tokens.shopCipher };
  }

  const refreshed = await refreshTikTokAccessToken(tokens.refreshToken);
  await saveTikTokTokens({ ...refreshed, shopCipher: tokens.shopCipher });
  return { accessToken: refreshed.accessToken, shopCipher: tokens.shopCipher };
}

/**
 * Executa uma chamada assinada à TikTok Shop Open API, renovando o access
 * token automaticamente quando necessário.
 *
 * IMPORTANTE: os paths dos endpoints de Afiliados (busca de produtos,
 * geração de link) dependem da versão liberada para o app no Partner Center
 * (Affiliate Seller/Creator/Partner API) — confirme o path exato na
 * documentação antes de usar em produção.
 */
export async function tiktokSignedRequest<T>(params: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}): Promise<T> {
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET não configurados.");
  }

  const { method = "GET", path, body } = params;
  const { accessToken, shopCipher } = await getValidAccessToken();

  const query: Record<string, string | number | undefined> = {
    ...params.query,
    app_key: CLIENT_KEY,
    timestamp: Math.floor(Date.now() / 1000),
    shop_cipher: shopCipher,
  };

  const sign = signRequest({ path, query, body, appSecret: CLIENT_SECRET });

  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries({ ...query, sign })) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": accessToken,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();

  if (!response.ok || json.code !== 0) {
    logger.error("PRODUCT_SYNC", `TikTok: chamada a ${path} falhou`, { status: response.status, body: json });
    throw new Error(`TikTok API error em ${path}: ${json.message ?? response.statusText}`);
  }

  return json.data as T;
}
