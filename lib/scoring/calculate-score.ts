import { DEFAULT_SCORE_WEIGHTS, type ScoreWeights } from "./weights";

export interface ScoreInput {
  discountPercent?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  soldCount?: number | null;
  commissionPercent?: number | null;
  price?: number | null;
  /** Variação percentual de vendas/cliques recentes; positivo = em alta. */
  trendPercent?: number | null;
  /** Taxa de conversão histórica do produto (cliques -> vendas), em %. */
  conversionRate?: number | null;
}

export interface ScoreBreakdown {
  discountScore: number;
  ratingScore: number;
  salesScore: number;
  commissionScore: number;
  priceScore: number;
  trendScore: number;
  conversionScore: number;
  totalScore: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/**
 * Calcula o score de oportunidade de um produto (0-100 por dimensão e total).
 * Heurísticas iniciais — devem ser recalibradas com dados reais de conversão.
 */
export function calculateProductScore(input: ScoreInput, weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS): ScoreBreakdown {
  const discountScore = clamp((input.discountPercent ?? 0) * 2); // 50% de desconto => 100
  const ratingScore = clamp(((input.rating ?? 0) / 5) * 100);
  const salesScore = clamp(Math.log10((input.soldCount ?? 0) + 1) * 25); // ~10k vendas => 100
  const commissionScore = clamp((input.commissionPercent ?? 0) * 5); // 20% comissão => 100
  const priceScore = clamp(100 - Math.log10((input.price ?? 0) + 1) * 15); // preços menores pontuam mais
  const trendScore = clamp(50 + (input.trendPercent ?? 0));
  const conversionScore = clamp((input.conversionRate ?? 0) * 10); // 10% conversão => 100

  const totalScore = clamp(
    discountScore * weights.discount +
      ratingScore * weights.rating +
      salesScore * weights.sales +
      commissionScore * weights.commission +
      priceScore * weights.price +
      trendScore * weights.trend +
      conversionScore * weights.conversion,
  );

  return {
    discountScore,
    ratingScore,
    salesScore,
    commissionScore,
    priceScore,
    trendScore,
    conversionScore,
    totalScore,
  };
}
