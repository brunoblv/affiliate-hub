import { logger } from "@/lib/logging";
import { getSiteUrl } from "@/lib/site-url";
import { sincronizarPaginasMeta } from "./credentials";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string };
}

function requireApp() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET não configurados.");
  }
  return { appId, appSecret };
}

export function metaOAuthConfigurado(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/**
 * URI de callback do Facebook Login. Tem que ser HTTPS (Facebook recusa HTTP
 * fora de localhost) e idêntica no authorize, no callback e no app da Meta.
 *
 * Não usa `request.url`: atrás de nginx/PM2 isso vira `http://127.0.0.1:3000/...`
 * e o Facebook bloqueia com "não está usando uma conexão segura".
 */
export function getMetaRedirectUri(): string {
  const bruto = process.env.META_REDIRECT_URI || `${getSiteUrl()}/api/integrations/meta/callback`;
  const url = new URL(bruto);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!local && url.protocol === "http:") {
    url.protocol = "https:";
  }
  return url.toString();
}

export function getMetaOAuthInfo(): { redirectUri: string; dominio: string; local: boolean } {
  const redirectUri = getMetaRedirectUri();
  const dominio = new URL(redirectUri).hostname;
  const local = dominio === "localhost" || dominio === "127.0.0.1";
  return { redirectUri, dominio, local };
}

export function buildMetaAuthorizationUrl(params: { redirectUri: string; state: string }): string {
  const { appId } = requireApp();
  const url = new URL(DIALOG);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

async function obterToken(url: URL): Promise<TokenResponse> {
  const resposta = await fetch(url);
  const json = (await resposta.json()) as TokenResponse;
  if (!resposta.ok || json.error) {
    throw new Error(json.error?.message ?? resposta.statusText);
  }
  if (!json.access_token) {
    throw new Error("Meta: resposta de token sem access_token.");
  }
  return json;
}

/** Troca o `code` do Facebook Login por um token de longa duração e sincroniza as páginas. */
export async function exchangeMetaAuthCode(params: { code: string; redirectUri: string }): Promise<void> {
  const { appId, appSecret } = requireApp();

  const curto = new URL(`${GRAPH}/oauth/access_token`);
  curto.searchParams.set("client_id", appId);
  curto.searchParams.set("redirect_uri", params.redirectUri);
  curto.searchParams.set("client_secret", appSecret);
  curto.searchParams.set("code", params.code);

  const tokenCurto = await obterToken(curto);

  const longo = new URL(`${GRAPH}/oauth/access_token`);
  longo.searchParams.set("grant_type", "fb_exchange_token");
  longo.searchParams.set("client_id", appId);
  longo.searchParams.set("client_secret", appSecret);
  longo.searchParams.set("fb_exchange_token", tokenCurto.access_token);

  let tokenLongo: TokenResponse;
  try {
    tokenLongo = await obterToken(longo);
  } catch (erro) {
    logger.warn("PUBLISH", "Meta: falha ao trocar por token de longa duração, usando o token curto", {
      error: erro instanceof Error ? erro.message : erro,
    });
    tokenLongo = tokenCurto;
  }

  const paginas = await sincronizarPaginasMeta(tokenLongo.access_token, tokenLongo.expires_in);
  logger.info("PUBLISH", "Meta: conta reconectada com sucesso", { paginas: paginas.length });
}
