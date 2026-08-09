import { Platform } from "@/lib/generated/prisma/client";
import type { AffiliatePlatformClient, NormalizedProduct } from "@/lib/integrations/types";
import { getRateLimiter } from "@/lib/integrations/rate-limiter";
import { withRetry } from "@/lib/integrations/retry";
import { logger } from "@/lib/logging";

const APP_ID = process.env.SHOPEE_APP_ID;
const SECRET = process.env.SHOPEE_SECRET;

// Limite provisório; ajustar de acordo com o plano/quota real da conta.
const rateLimiter = getRateLimiter("shopee", 10, 1_000);

/**
 * Cliente de integração com a Shopee Afiliados.
 * A lógica de negócio do sistema não deve depender diretamente do formato
 * de resposta da API — tudo aqui é convertido para NormalizedProduct.
 */
export class ShopeeClient implements AffiliatePlatformClient {
  readonly platform = Platform.SHOPEE;

  async authenticate(): Promise<void> {
    if (!APP_ID || !SECRET) {
      throw new Error("SHOPEE_APP_ID / SHOPEE_SECRET não configurados.");
    }
    // TODO: implementar assinatura de requisição da Shopee Open API (App ID + Secret).
    logger.info("PRODUCT_SYNC", "Shopee: autenticação ainda não implementada (stub)");
  }

  async searchProducts(query?: string): Promise<NormalizedProduct[]> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        // TODO: chamar Shopee Open API (GraphQL) de busca de produtos afiliados.
        logger.debug("PRODUCT_SYNC", "Shopee: searchProducts (stub)", { query });
        return [];
      }),
    );
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        // TODO: chamar endpoint de detalhe de produto da Shopee.
        logger.debug("PRODUCT_SYNC", "Shopee: getProduct (stub)", { externalId });
        return null;
      }),
    );
  }

  async generateAffiliateLink(externalId: string, subId?: string): Promise<string> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        // TODO: chamar generateShortLink da Shopee Affiliate API, usando subId quando disponível.
        logger.info("AFFILIATE_SYNC", "Shopee: generateAffiliateLink (stub)", { externalId, subId });
        return `https://shope.ee/stub-${externalId}`;
      }),
    );
  }

  async getCampaigns() {
    // TODO: listar campanhas ativas da Shopee.
    return [];
  }

  async getReports() {
    // TODO: relatório de comissões/vendas da Shopee.
    return [];
  }
}

export const shopeeClient = new ShopeeClient();
