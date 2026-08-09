import type { Platform } from "@/lib/generated/prisma/client";

/** Produto normalizado retornado por qualquer integração de afiliados. */
export interface NormalizedProduct {
  source: Platform;
  externalId: string;
  name: string;
  description?: string;
  brand?: string;
  categoryHint?: string;

  imageUrl?: string;
  productUrl?: string;

  price: number;
  originalPrice?: number;

  rating?: number;
  reviewCount?: number;
  soldCount?: number;

  commissionPercent?: number;
  commissionValue?: number;

  currency?: string;

  storeName?: string;
  raw?: unknown;
}

/** Contrato comum que toda integração de plataforma de afiliados deve implementar. */
export interface AffiliatePlatformClient {
  readonly platform: Platform;
  authenticate(): Promise<void>;
  searchProducts(query?: string): Promise<NormalizedProduct[]>;
  getProduct(externalId: string): Promise<NormalizedProduct | null>;
  generateAffiliateLink(externalId: string, subId?: string): Promise<string>;
}
