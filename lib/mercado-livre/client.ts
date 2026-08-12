import { Platform } from "@/lib/generated/prisma/client";
import type { AffiliatePlatformClient, NormalizedProduct } from "@/lib/integrations/types";
import { getRateLimiter } from "@/lib/integrations/rate-limiter";
import { withRetry } from "@/lib/integrations/retry";
import { logger } from "@/lib/logging";
import { getMercadoLivreTokens } from "./credentials";
import { mercadoLivreRequest } from "./request";

const CLIENT_ID = process.env.MERCADOLIVRE_CLIENT_ID;
const CLIENT_SECRET = process.env.MERCADOLIVRE_CLIENT_SECRET;

// Site MLB = Mercado Livre Brasil. Ajustar se a operação cobrir outros países.
const SITE_ID = "MLB";

// Limite provisório; ajustar de acordo com a quota real da conta de aplicação.
const rateLimiter = getRateLimiter("mercado-livre", 10, 1_000);

interface MLSearchResponse {
  results: Array<{
    id: string;
    title: string;
    price: number;
    original_price?: number | null;
    currency_id: string;
    thumbnail: string;
    permalink: string;
    sold_quantity?: number;
    seller?: { nickname?: string };
  }>;
}

interface MLItem {
  id: string;
  title: string;
  price: number;
  original_price?: number | null;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  sold_quantity?: number;
}

interface MLCatalogItemsResponse {
  paging: { total: number; offset: number; limit: number };
  results: Array<{
    item_id: string;
    price: number;
    original_price?: number | null;
  }>;
}

interface MLCatalogProductResponse {
  id: string;
  name: string;
  pictures?: Array<{ url: string }>;
}

function toNormalizedProduct(item: MLSearchResponse["results"][number] | MLItem): NormalizedProduct {
  return {
    source: Platform.MERCADO_LIVRE,
    externalId: item.id,
    name: item.title,
    imageUrl: item.thumbnail,
    productUrl: item.permalink,
    price: item.price,
    originalPrice: item.original_price ?? undefined,
    soldCount: item.sold_quantity,
    currency: item.currency_id,
    raw: item,
  };
}

/**
 * Cliente de integração com a API oficial do Mercado Livre.
 * Escopo desta integração: buscar/consultar produtos (spec do doc
 * meu-novo-lar-integracao-mercado-livre.md — "Papel da API oficial").
 *
 * A geração de link de afiliado NÃO é implementada aqui: o único endpoint
 * conhecido para isso (`affiliate-program/api/v2/affiliates/createLink`) foi
 * identificado via engenharia reversa do Portal de Afiliados e o próprio
 * documento de referência instrui tratá-lo como endpoint interno não público
 * até confirmação oficial — não deve ser automatizado a partir do backend.
 */
export class MercadoLivreClient implements AffiliatePlatformClient {
  readonly platform = Platform.MERCADO_LIVRE;

  /** Confirma que há credenciais configuradas e uma conta Mercado Livre conectada (tokens salvos). */
  async authenticate(): Promise<void> {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error("MERCADOLIVRE_CLIENT_ID / MERCADOLIVRE_CLIENT_SECRET não configurados.");
    }

    const tokens = await getMercadoLivreTokens();
    if (!tokens) {
      throw new Error(
        "Nenhuma conta Mercado Livre conectada. Acesse /admin/integrations e conecte a conta antes de sincronizar.",
      );
    }

    logger.info("PRODUCT_SYNC", "Mercado Livre: credenciais válidas", { userId: tokens.userId });
  }

  async searchProducts(query?: string): Promise<NormalizedProduct[]> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        const data = await mercadoLivreRequest<MLSearchResponse>(`/sites/${SITE_ID}/search`, { q: query ?? "" });
        return data.results.map(toNormalizedProduct);
      }),
    );
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        const item = await mercadoLivreRequest<MLItem>(`/items/${externalId}`);
        return toNormalizedProduct(item);
      }),
    );
  }

  /**
   * `/items/{id}` retorna 403 (access_denied) para itens de vendedores fora da
   * conta autenticada — a API de itens só permite acesso pleno aos anúncios do
   * próprio usuário conectado. Para consultar preço de itens de terceiros
   * (o caso de produtos de afiliados), a API de Catálogo funciona normalmente:
   * `/products/{catalogProductId}/items` lista os anúncios (com preço) que
   * disputam a buy box daquele produto de catálogo.
   */
  async getItemPriceViaCatalog(catalogProductId: string, itemId: string): Promise<{ price: number; originalPrice?: number } | null> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        const data = await mercadoLivreRequest<MLCatalogItemsResponse>(`/products/${catalogProductId}/items`);
        const match = data.results.find((result) => result.item_id === itemId);
        if (!match) return null;
        return { price: match.price, originalPrice: match.original_price ?? undefined };
      }),
    );
  }

  /** Nome + imagem do produto de catálogo — usado junto com getItemPriceViaCatalog() para refrescar dados de itens de terceiros. */
  async getCatalogProductInfo(catalogProductId: string): Promise<{ name: string; imageUrl?: string } | null> {
    return rateLimiter.acquire().then(() =>
      withRetry(async () => {
        const product = await mercadoLivreRequest<MLCatalogProductResponse>(`/products/${catalogProductId}`);
        return { name: product.name, imageUrl: product.pictures?.[0]?.url };
      }),
    );
  }

  /**
   * Não implementado propositalmente — ver aviso na doc da classe. Enquanto
   * não houver um método oficial confirmado, links de afiliado do Mercado
   * Livre devem ser gerados manualmente no Portal de Afiliados e cadastrados
   * via "Criar link" na tela do produto.
   */
  async generateAffiliateLink(): Promise<string> {
    throw new Error(
      "Geração automática de link de afiliado do Mercado Livre não é suportada (endpoint não oficial). " +
        "Gere o link no Portal de Afiliados e cadastre manualmente na tela do produto.",
    );
  }

  async getReports() {
    // TODO: relatório de comissões/cliques do painel de Afiliados (sem API oficial confirmada ainda).
    return [];
  }
}

export const mercadoLivreClient = new MercadoLivreClient();
