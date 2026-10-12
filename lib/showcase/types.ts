import type { PriceAssessment } from "@/lib/history/analysis";

/** O que a seleção da vitrine precisa saber de uma oferta de uma loja. Dados já calculados (puro). */
export interface ShowcaseItem {
  productId: string;
  offerId: string;
  variantId: string;
  storeId: string;
  priceCents: number;
  priceObservedAt: Date;
  /** Preço de referência que a LOJA declara; nunca calculado por nós. */
  declaredPreviousCents: number | null;
  atMinimum: boolean;
  assessment: PriceAssessment;
  /** Negativo = abaixo da média de 30 dias. Só existe com histórico suficiente. */
  differenceFromAveragePct: number | null;
  /** Queda nos últimos 7 dias em %, sobre o maior preço observado na janela. */
  drop7dPct: number | null;
  salesCount: number | null;
  ratingCentis: number | null;
  metricsCheckedAt: Date | null;
  offerCreatedAt: Date;
}
