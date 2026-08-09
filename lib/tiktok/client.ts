import { Platform } from "@/lib/generated/prisma/client";
import type { AffiliatePlatformClient, NormalizedProduct } from "@/lib/integrations/types";
import { getRateLimiter } from "@/lib/integrations/rate-limiter";
import { withRetry } from "@/lib/integrations/retry";
import { logger } from "@/lib/logging";
import { getTikTokTokens } from "./credentials";
import { tiktokSignedRequest } from "./request";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

const rateLimiter = getRateLimiter("tiktok", 10, 1_000);

/**
 * Paths dos endpoints de Afiliados — dependem da versão liberada para o app
 * no Partner Center (Affiliate Seller/Creator/Partner API exigem aprovação
 * separada da TikTok). Confirme os paths exatos em partner.tiktokshop.com
 * antes de usar em produção; a infraestrutura de auth/assinatura (auth.ts,
 * sign.ts, request.ts) já está correta e funcional.
 */
const ENDPOINTS = {
  searchAffiliateProducts: "/affiliate_seller/202405/products/search",
  getProduct: "/product/202309/products",
  generateAffiliateLink: "/affiliate_creator/202405/products/links",
};

/** Cliente de integração com TikTok Shop / TikTok Affiliate. */
export class TikTokClient implements AffiliatePlatformClient {
  readonly platform = Platform.TIKTOK_SHOP;

  /** Confirma que há credenciais configuradas e uma conta TikTok Shop conectada (tokens salvos). */
  async authenticate(): Promise<void> {
    if (!CLIENT_KEY || !CLIENT_SECRET) {
      throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET não configurados.");
    }

    const tokens = await getTikTokTokens();
    if (!tokens) {
      throw new Error(
        "Nenhuma conta TikTok Shop conectada. Acesse /admin/integrations e conecte a conta antes de sincronizar.",
      );
    }

    logger.info("PRODUCT_SYNC", "TikTok: credenciais válidas", { seller: tokens.sellerName });
  }

  async searchProducts(query?: string): Promise<NormalizedProduct[]> {
    return this.getAffiliateProducts(query);
  }

  async getAffiliateProducts(query?: string): Promise<NormalizedProduct[]> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        interface AffiliateProductsResponse {
          products: Array<{
            product_id: string;
            product_name: string;
            image?: { url: string };
            price?: { original_price: string; sale_price: string };
            commission_rate?: string;
            product_rating?: string;
            sold_count?: number;
          }>;
        }

        const data = await tiktokSignedRequest<AffiliateProductsResponse>({
          path: ENDPOINTS.searchAffiliateProducts,
          method: "POST",
          body: { keyword: query, page_size: 50 },
        });

        return data.products.map((p): NormalizedProduct => ({
          source: Platform.TIKTOK_SHOP,
          externalId: p.product_id,
          name: p.product_name,
          imageUrl: p.image?.url,
          price: Number(p.price?.sale_price ?? 0),
          originalPrice: p.price?.original_price ? Number(p.price.original_price) : undefined,
          commissionPercent: p.commission_rate ? Number(p.commission_rate) : undefined,
          rating: p.product_rating ? Number(p.product_rating) : undefined,
          soldCount: p.sold_count,
          currency: "BRL",
          raw: p,
        }));
      }),
    );
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        interface ProductResponse {
          id: string;
          title: string;
          main_images?: Array<{ url_list?: string[] }>;
          skus?: Array<{ price?: { original_price: string; sale_price: string } }>;
        }

        const data = await tiktokSignedRequest<ProductResponse>({
          path: `${ENDPOINTS.getProduct}/${externalId}`,
          method: "GET",
        });

        return {
          source: Platform.TIKTOK_SHOP,
          externalId: data.id,
          name: data.title,
          imageUrl: data.main_images?.[0]?.url_list?.[0],
          price: Number(data.skus?.[0]?.price?.sale_price ?? 0),
          originalPrice: data.skus?.[0]?.price?.original_price
            ? Number(data.skus[0].price.original_price)
            : undefined,
          currency: "BRL",
          raw: data,
        } satisfies NormalizedProduct;
      }),
    );
  }

  async generateAffiliateLink(externalId: string): Promise<string> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        interface LinkResponse {
          link: string;
        }

        const data = await tiktokSignedRequest<LinkResponse>({
          path: ENDPOINTS.generateAffiliateLink,
          method: "POST",
          body: { product_ids: [externalId] },
        });

        logger.info("AFFILIATE_SYNC", "TikTok: link de afiliado gerado", { externalId });
        return data.link;
      }),
    );
  }

  async publish(payload: unknown) {
    // TODO: publicação de vídeo/conteúdo via TikTok Content Posting API (escopo separado).
    logger.info("PUBLISH", "TikTok: publish (stub)", payload);
  }

  async getAnalytics() {
    // TODO: métricas de performance via TikTok Business/Shop API.
    return [];
  }
}

export const tiktokClient = new TikTokClient();
