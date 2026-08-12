import { logger } from "@/lib/logging";
import { exchangeToLongLivedUserToken, fetchConnectedPages } from "./auth";
import {
  getMetaPageByPageId,
  getMetaTokens,
  listActiveMetaPages,
  saveMetaTokens,
  type MetaTokenSet,
} from "./credentials";
import { readMetaUserTokenFromEnv } from "./user-token-env";

let inFlight: Promise<MetaTokenSet | null> | null = null;

/**
 * Garante Page Access Tokens em meta_facebook_pages a partir de META_USER_TOKEN
 * no .env, sem OAuth no browser.
 *
 * Páginas do Facebook: o page token obtido de um user token long-lived não
 * expira; basta popular a tabela uma vez. Se pageId for passado e já existir
 * ativo, não chama a Graph API.
 */
export async function ensureMetaPagesFromEnv(options?: {
  pageId?: string;
  force?: boolean;
}): Promise<MetaTokenSet | null> {
  const pageId = options?.pageId;
  const force = options?.force ?? false;

  if (!force) {
    if (pageId) {
      // Page Access Token já no banco basta para publicar; não exige OAuth.
      const existing = await getMetaPageByPageId(pageId);
      if (existing) return getMetaTokens();
    } else {
      const pages = await listActiveMetaPages();
      if (pages.length > 0) return getMetaTokens();
    }
  }

  const envToken = readMetaUserTokenFromEnv();
  if (!envToken) {
    return getMetaTokens();
  }

  if (!inFlight) {
    inFlight = bootstrapFromEnvToken(envToken).finally(() => {
      inFlight = null;
    });
  }

  const tokens = await inFlight;

  if (pageId && tokens && !tokens.pages.some((p) => p.id === pageId)) {
    throw new Error(
      `META_USER_TOKEN não administra a Página ${pageId}. Confira se o token é do usuário admin dessa página.`,
    );
  }

  return tokens;
}

async function bootstrapFromEnvToken(userAccessToken: string): Promise<MetaTokenSet> {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    throw new Error("META_APP_ID / META_APP_SECRET não configurados.");
  }

  logger.info("PUBLISH", "Meta: carregando Páginas a partir de META_USER_TOKEN (sem OAuth)");

  const longLived = await exchangeToLongLivedUserToken(userAccessToken);
  const pages = await fetchConnectedPages(longLived.accessToken);

  if (pages.length === 0) {
    throw new Error(
      "META_USER_TOKEN ok, mas /me/accounts não retornou Páginas. Confira pages_show_list / pages_manage_posts.",
    );
  }

  const tokens: MetaTokenSet = {
    userAccessToken: longLived.accessToken,
    userAccessTokenExpireAt: Date.now() + longLived.expiresInSeconds * 1000,
    pages,
  };

  await saveMetaTokens(tokens);
  logger.info("PUBLISH", "Meta: Páginas prontas via .env", { pageCount: pages.length });

  return tokens;
}
