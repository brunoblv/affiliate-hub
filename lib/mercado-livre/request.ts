import { logger } from "@/lib/logging";
import { getMercadoLivreTokens, saveMercadoLivreTokens } from "./credentials";
import { refreshMercadoLivreAccessToken } from "./auth";

const API_BASE_URL = "https://api.mercadolibre.com";

async function getValidAccessToken(): Promise<string> {
  const tokens = await getMercadoLivreTokens();
  if (!tokens) {
    throw new Error("Mercado Livre não conectado. Autorize o app em /admin/integrations antes de chamar a API.");
  }

  const expiresInLessThan5Min = tokens.accessTokenExpireAt - Date.now() < 5 * 60 * 1000;
  if (!expiresInLessThan5Min) return tokens.accessToken;

  const refreshed = await refreshMercadoLivreAccessToken(tokens.refreshToken);
  await saveMercadoLivreTokens(refreshed);
  return refreshed.accessToken;
}

/** Chamada autenticada à API oficial do Mercado Livre, renovando o token quando necessário. */
export async function mercadoLivreRequest<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const accessToken = await getValidAccessToken();

  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  const json = await response.json();

  if (!response.ok) {
    logger.error("PRODUCT_SYNC", `Mercado Livre: chamada a ${path} falhou`, { status: response.status, body: json });
    throw new Error(`Mercado Livre API error em ${path}: ${json.message ?? response.statusText}`);
  }

  return json as T;
}
