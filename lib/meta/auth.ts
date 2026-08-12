import { logger } from "@/lib/logging";
import { GRAPH_API_BASE_URL } from "./graph-version";
import { saveMetaTokens, type MetaPage, type MetaTokenSet } from "./credentials";

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

// Escopos mínimos para publicar em Páginas do Facebook e contas Instagram vinculadas.
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

function requireCredentials() {
  if (!APP_ID || !APP_SECRET) {
    throw new Error("META_APP_ID / META_APP_SECRET não configurados.");
  }
  return { appId: APP_ID, appSecret: APP_SECRET };
}

/** Monta a URL do diálogo de login do Facebook para o usuário autorizar o app. */
export function buildMetaAuthorizationUrl(redirectUri: string, state?: string): string {
  const { appId } = requireCredentials();

  const url = new URL("https://www.facebook.com/v23.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  if (state) url.searchParams.set("state", state);

  return url.toString();
}

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface GraphAccountsResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
}

/** Busca as Páginas do Facebook conectadas à conta (com token próprio + IG vinculado, quando houver). */
export async function fetchConnectedPages(userAccessToken: string): Promise<MetaPage[]> {
  const accountsUrl = new URL(`${GRAPH_API_BASE_URL}/me/accounts`);
  accountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account");
  accountsUrl.searchParams.set("access_token", userAccessToken);

  const accountsResponse = await fetch(accountsUrl);
  const accounts = (await accountsResponse.json()) as GraphAccountsResponse & { error?: { message: string } };

  if (!accountsResponse.ok) {
    logger.error("PUBLISH", "Meta: falha ao buscar Páginas conectadas", { error: accounts.error });
    throw new Error(`Meta /me/accounts falhou: ${accounts.error?.message ?? accountsResponse.statusText}`);
  }

  return (accounts.data ?? []).map((page) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    instagramBusinessAccountId: page.instagram_business_account?.id,
  }));
}

/**
 * Converte um user token (curto ou já long-lived) em long-lived (~60 dias).
 * Se a troca falhar (token já long-lived / app em modo dev), devolve o original.
 */
export async function exchangeToLongLivedUserToken(
  userAccessToken: string,
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const { appId, appSecret } = requireCredentials();

  const longLivedUrl = new URL(`${GRAPH_API_BASE_URL}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", userAccessToken);

  const longLivedResponse = await fetch(longLivedUrl);
  const longLived = (await longLivedResponse.json()) as GraphTokenResponse & { error?: { message: string } };

  if (!longLivedResponse.ok || !longLived.access_token) {
    logger.error("PUBLISH", "Meta: falha ao estender o user token para long-lived", {
      error: longLived.error?.message,
    });
    // Não fingir 60 dias de validade aqui: se a troca falhar, o token original
    // segue com a expiração curta que já tinha (minutos/horas) — assumir 60
    // dias faria o sistema salvar Page Access Tokens fadados a expirar em
    // horas, com o banco dizendo que valem por meses.
    throw new Error(
      `Meta: não foi possível gerar um user token long-lived (${longLived.error?.message ?? longLivedResponse.statusText}). Gere um META_USER_TOKEN novo e tente de novo.`,
    );
  }

  return {
    accessToken: longLived.access_token,
    expiresInSeconds: longLived.expires_in ?? 60 * 24 * 60 * 60,
  };
}

/**
 * Troca o `code` do callback por um token de curta duração, converte para
 * long-lived (~60 dias) e busca as Páginas conectadas (com seus tokens
 * próprios e a conta do Instagram vinculada, quando houver).
 */
export async function exchangeMetaAuthCode(code: string, redirectUri: string): Promise<MetaTokenSet> {
  const { appId, appSecret } = requireCredentials();

  const shortLivedUrl = new URL(`${GRAPH_API_BASE_URL}/oauth/access_token`);
  shortLivedUrl.searchParams.set("client_id", appId);
  shortLivedUrl.searchParams.set("client_secret", appSecret);
  shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
  shortLivedUrl.searchParams.set("code", code);

  const shortLivedResponse = await fetch(shortLivedUrl);
  const shortLived = (await shortLivedResponse.json()) as GraphTokenResponse & { error?: { message: string } };

  if (!shortLivedResponse.ok || !shortLived.access_token) {
    logger.error("PUBLISH", "Meta: falha ao trocar code por token", { error: shortLived.error });
    throw new Error(`Meta token exchange falhou: ${shortLived.error?.message ?? shortLivedResponse.statusText}`);
  }

  const longLived = await exchangeToLongLivedUserToken(shortLived.access_token);
  const pages = await fetchConnectedPages(longLived.accessToken);

  const tokens: MetaTokenSet = {
    userAccessToken: longLived.accessToken,
    userAccessTokenExpireAt: Date.now() + longLived.expiresInSeconds * 1000,
    pages,
  };

  await saveMetaTokens(tokens);
  logger.info("PUBLISH", "Meta: conta conectada com sucesso", { pageCount: pages.length });

  return tokens;
}
