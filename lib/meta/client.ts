import { getRateLimiter } from "@/lib/integrations/rate-limiter";
import { withRetry } from "@/lib/integrations/retry";
import { logger } from "@/lib/logging";
import { getMetaTokens, saveMetaTokens, type MetaPage } from "./credentials";
import { graphRequest } from "./request";
import { GRAPH_API_BASE_URL } from "./graph-version";
import { fetchConnectedPages } from "./auth";

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

const rateLimiter = getRateLimiter("meta", 200, 60 * 60 * 1_000);

export interface MetaPostPayload {
  message: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string;
}

async function requirePage(pageId: string): Promise<MetaPage> {
  const tokens = await getMetaTokens();
  const page = tokens?.pages.find((p) => p.id === pageId);
  if (!page) {
    throw new Error(`Página ${pageId} não encontrada entre as contas conectadas. Reconecte em /admin/integrations.`);
  }
  return page;
}

async function requirePageByInstagramAccount(igUserId: string): Promise<MetaPage> {
  const tokens = await getMetaTokens();
  const page = tokens?.pages.find((p) => p.instagramBusinessAccountId === igUserId);
  if (!page) {
    throw new Error(`Conta Instagram ${igUserId} não encontrada entre as contas conectadas. Reconecte em /admin/integrations.`);
  }
  return page;
}

/**
 * Módulo de integração com Meta Graph API (Facebook e Instagram).
 * Responsabilidades isoladas do resto da aplicação: nada fora de lib/meta
 * deve conhecer detalhes de endpoints/payloads da Graph API.
 */
export class MetaClient {
  async authenticate(): Promise<void> {
    if (!APP_ID || !APP_SECRET) {
      throw new Error("META_APP_ID / META_APP_SECRET não configurados.");
    }

    const tokens = await getMetaTokens();
    if (!tokens) {
      throw new Error("Nenhuma conta Meta conectada. Acesse /admin/integrations e conecte a conta antes de publicar.");
    }

    logger.info("PUBLISH", "Meta: credenciais válidas", { pageCount: tokens.pages.length });
  }

  /** Páginas do Facebook (e contas Instagram vinculadas) conectadas via OAuth. */
  async getAccounts(): Promise<MetaPage[]> {
    const tokens = await getMetaTokens();
    return tokens?.pages ?? [];
  }

  async publishFacebookPost(pageId: string, payload: MetaPostPayload) {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        const page = await requirePage(pageId);

        const result: { id: string; post_id?: string } = payload.imageUrl
          ? await graphRequest<{ id: string; post_id?: string }>(`/${pageId}/photos`, {
              method: "POST",
              accessToken: page.accessToken,
              params: { url: payload.imageUrl, caption: payload.message, published: true },
            })
          : await graphRequest<{ id: string; post_id?: string }>(`/${pageId}/feed`, {
              method: "POST",
              accessToken: page.accessToken,
              params: { message: payload.message, link: payload.link },
            });

        logger.info("PUBLISH", "Meta: post no Facebook publicado", { pageId, id: result.id });
        return { id: result.post_id ?? result.id };
      }),
    );
  }

  /** Publica um post de imagem no Instagram via fluxo de duas etapas (container + publish). */
  async publishInstagramPost(igUserId: string, payload: MetaPostPayload) {
    return rateLimiter.acquire().then(() => withRetry(() => this.publishInstagramMedia(igUserId, payload, "IMAGE")));
  }

  async publishStory(igUserId: string, payload: MetaPostPayload) {
    return rateLimiter.acquire().then(() => withRetry(() => this.publishInstagramMedia(igUserId, payload, "STORIES")));
  }

  async publishReel(igUserId: string, payload: MetaPostPayload) {
    return rateLimiter.acquire().then(() => withRetry(() => this.publishInstagramMedia(igUserId, payload, "REELS")));
  }

  private async publishInstagramMedia(
    igUserId: string,
    payload: MetaPostPayload,
    mediaType: "IMAGE" | "STORIES" | "REELS",
  ): Promise<{ id: string }> {
    const page = await requirePageByInstagramAccount(igUserId);

    const isVideo = mediaType === "REELS" || (mediaType === "STORIES" && payload.videoUrl);
    if (isVideo && !payload.videoUrl) {
      throw new Error(`${mediaType} exige videoUrl.`);
    }
    if (!isVideo && !payload.imageUrl) {
      throw new Error(`${mediaType} exige imageUrl.`);
    }

    const container = await graphRequest<{ id: string }>(`/${igUserId}/media`, {
      method: "POST",
      accessToken: page.accessToken,
      params: {
        caption: payload.message,
        image_url: !isVideo ? payload.imageUrl : undefined,
        video_url: isVideo ? payload.videoUrl : undefined,
        media_type: mediaType === "IMAGE" ? undefined : mediaType,
      },
    });

    const published = await graphRequest<{ id: string }>(`/${igUserId}/media_publish`, {
      method: "POST",
      accessToken: page.accessToken,
      params: { creation_id: container.id },
    });

    logger.info("PUBLISH", `Meta: ${mediaType} publicado no Instagram`, { igUserId, id: published.id });
    return published;
  }

  async getInsights(objectId: string, metrics: string[] = ["impressions", "reach", "engagement"]) {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        const tokens = await getMetaTokens();
        const page = tokens?.pages.find((p) => p.id === objectId || p.instagramBusinessAccountId === objectId);
        if (!page) {
          throw new Error(`Objeto ${objectId} não encontrado entre as contas conectadas.`);
        }

        const result = await graphRequest<{ data: unknown[] }>(`/${objectId}/insights`, {
          accessToken: page.accessToken,
          params: { metric: metrics.join(",") },
        });

        return result.data;
      }),
    );
  }

  /**
   * Estende a validade do token de usuário atual (o token long-lived pode
   * ser trocado por um novo antes de expirar; Meta não oferece um "refresh
   * token" tradicional — passados ~60 dias sem uso, é preciso reconectar
   * via OAuth novamente em /admin/integrations).
   */
  async refreshToken(): Promise<void> {
    if (!APP_ID || !APP_SECRET) {
      throw new Error("META_APP_ID / META_APP_SECRET não configurados.");
    }

    const tokens = await getMetaTokens();
    if (!tokens) {
      throw new Error("Nenhuma conta Meta conectada.");
    }

    const url = new URL(`${GRAPH_API_BASE_URL}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", APP_ID);
    url.searchParams.set("client_secret", APP_SECRET);
    url.searchParams.set("fb_exchange_token", tokens.userAccessToken);

    const response = await fetch(url);
    const json = (await response.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };

    if (!response.ok || !json.access_token) {
      logger.error("PUBLISH", "Meta: falha ao renovar token", { error: json.error });
      throw new Error(`Meta: falha ao renovar token — reconecte em /admin/integrations. (${json.error?.message ?? response.statusText})`);
    }

    const pages = await fetchConnectedPages(json.access_token);

    await saveMetaTokens({
      userAccessToken: json.access_token,
      userAccessTokenExpireAt: Date.now() + (json.expires_in ?? 60 * 24 * 60 * 60) * 1000,
      pages,
    });

    logger.info("PUBLISH", "Meta: token renovado com sucesso");
  }
}

export const metaClient = new MetaClient();
