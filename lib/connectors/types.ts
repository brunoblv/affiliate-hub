/**
 * Contrato comum dos conectores de loja (RF-06).
 *
 * O catálogo e a interface nunca conhecem campos de uma loja específica: todo
 * conector devolve este formato normalizado. Cada conector declara o que
 * realmente sabe fazer, e a falta de uma capacidade não bloqueia o cadastro manual.
 */

/** Identificação de uma oferta na loja de origem. */
export interface OfferRef {
  externalListingId: string;
  externalSellerId: string | null;
  originalUrl: string | null;
}

/** Somente condições observadas nesta coleta, nunca herdadas de um preço anterior. */
export interface CommercialContext {
  priceCondition?: string | null;
  installments?: number | null;
  installmentPriceCents?: number | null;
  shippingKind?: "FREE" | "PAID" | "CONDITIONAL" | "UNKNOWN" | null;
  shippingCents?: number | null;
}

export type FetchResult =
  | {
      kind: "ok";
      /** Centavos inteiros, sempre > 0. */
      priceCents: number;
      commercialContext?: CommercialContext;
      /** Preço de referência informado pela loja, quando há desconto. */
      previousPriceCents: number | null;
      /** null = a fonte não informa; não sobrescreve o que já está cadastrado. */
      availability: "IN_STOCK" | "OUT_OF_STOCK" | null;
      title: string | null;
      /** Nome do vendedor/loja no marketplace, quando a fonte informa. */
      sellerName?: string | null;
      imageUrl: string | null;
      /** Galeria completa (inclui imageUrl), quando a fonte informa. */
      imageUrls?: string[];
      /** Link de afiliado devolvido pela fonte (só usado se a oferta ainda não tiver um). */
      affiliateUrl: string | null;
      observedAt: Date;
      /** Métricas DA LOJA, quando a fonte as devolve junto do preço (A.10). */
      salesCount?: number | null;
      ratingCentis?: number | null;
      ratingCount?: number | null;
    }
  /**
   * A fonte respondeu, mas não tem o anúncio. Diferente de falha de rede: pode
   * ser produto removido ou apenas fora da vitrine de afiliados.
   */
  | { kind: "not_found" };

/** Pauta de busca de candidatos (RF-16). */
export interface DiscoveryQueryInput {
  kind: "keyword" | "category" | "shop" | "hot" | "promo";
  /** Palavra-chave, id de categoria ou de loja. */
  value?: string;
  sort: "sales" | "relevance" | "commission" | "discount";
  page: number;
  limit: number;
}

/** Candidato normalizado, igual para qualquer fonte. Nada aqui é estimado. */
export interface RawCandidate {
  externalListingId: string;
  externalSellerId: string | null;
  sellerName: string | null;
  /** Marcador de loja oficial/mall quando a fonte informa. */
  officialStore: boolean | null;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  previousPriceCents: number | null;
  /** Vendas acumuladas ou dos últimos 30 dias, conforme a fonte. */
  salesCount: number | null;
  /** 0–500 (centésimos de estrela), seguindo a convenção de inteiros do projeto. */
  ratingCentis: number | null;
  ratingCount: number | null;
  /** Centésimos de ponto percentual (12,5% = 1250). */
  commissionPct: number | null;
  discountPct: number | null;
  categoryPath: string[];
  observedAt: Date;
}

export interface DiscoveryPage {
  candidates: RawCandidate[];
  page: number;
  hasNextPage: boolean;
}

export interface ConnectorCapabilities {
  fetchPrice: boolean;
  fetchAvailability: boolean;
  affiliateLink: boolean;
  /** Implementa `searchCandidates`. */
  discovery?: boolean;
}

export interface Connector {
  key: string;
  label: string;
  capabilities: ConnectorCapabilities;
  /** Máximo de consultas simultâneas e intervalo mínimo entre elas. */
  limits: { concurrency: number; minIntervalMs: number };
  /** Credenciais presentes? Sem elas o worker não tenta e o painel avisa. */
  isConfigured(): boolean;
  /** Falso quando o anúncio se identifica só pelo ID (ex.: catálogo do Mercado Livre). Padrão: exige. */
  requiresSellerId?: boolean;
  /** Extrai os identificadores externos de uma URL colada pelo admin. */
  parseUrl?(url: string): { listingId: string; sellerId: string | null } | null;
  /** Link curto desta loja (ex.: s.click.aliexpress.com) -> URL completa do produto. null = não é link curto dela. */
  resolveShortUrl?(url: string): Promise<string | null>;
  /** Falha de rede/API lança erro (nova tentativa); anúncio ausente devolve `not_found`. */
  fetchOffer(ref: OfferRef): Promise<FetchResult>;
  /** Busca candidatos para a descoberta automática. Falha de rede lança erro. */
  searchCandidates?(input: DiscoveryQueryInput): Promise<DiscoveryPage>;
}
