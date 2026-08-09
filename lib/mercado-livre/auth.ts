import { logger } from "@/lib/logging";
import { saveMercadoLivreTokens, type MercadoLivreTokenSet } from "./credentials";

const CLIENT_ID = process.env.MERCADOLIVRE_CLIENT_ID;
const CLIENT_SECRET = process.env.MERCADOLIVRE_CLIENT_SECRET;

// Domínio de autorização do Brasil; outros países usam auth.mercadolibre.<tld>.
const AUTHORIZATION_URL = "https://auth.mercadolivre.com.br/authorization";
const TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

function requireCredentials() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("MERCADOLIVRE_CLIENT_ID / MERCADOLIVRE_CLIENT_SECRET não configurados.");
  }
  return { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };
}

/** Monta a URL de autorização OAuth2 (PKCE) do Mercado Livre. */
export function buildMercadoLivreAuthorizationUrl(params: {
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const { clientId } = requireCredentials();

  const url = new URL(AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);

  return url.toString();
}

function toTokenSet(data: TokenResponse): MercadoLivreTokenSet {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpireAt: Date.now() + data.expires_in * 1000,
    userId: data.user_id,
    scope: data.scope,
  };
}

/** Troca o `code` (+ code_verifier do PKCE) pelos tokens de acesso. */
export async function exchangeMercadoLivreAuthCode(params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<MercadoLivreTokenSet> {
  const { clientId, clientSecret } = requireCredentials();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    logger.error("PRODUCT_SYNC", "Mercado Livre: falha ao trocar code por token", { error: json });
    throw new Error(`Mercado Livre token exchange falhou: ${json.message ?? response.statusText}`);
  }

  const tokens = toTokenSet(json as TokenResponse);
  await saveMercadoLivreTokens(tokens);
  logger.info("PRODUCT_SYNC", "Mercado Livre: conta conectada com sucesso", { userId: tokens.userId });

  return tokens;
}

/** Renova o access token usando o refresh token salvo. */
export async function refreshMercadoLivreAccessToken(refreshToken: string): Promise<MercadoLivreTokenSet> {
  const { clientId, clientSecret } = requireCredentials();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    logger.error("PRODUCT_SYNC", "Mercado Livre: falha ao renovar token", { error: json });
    throw new Error(`Mercado Livre token refresh falhou: ${json.message ?? response.statusText}`);
  }

  const tokens = toTokenSet(json as TokenResponse);
  await saveMercadoLivreTokens(tokens);

  return tokens;
}
