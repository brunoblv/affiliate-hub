/** Pesos padrão do score de oportunidade (spec §8). Ajustáveis com dados reais. */
export const DEFAULT_SCORE_WEIGHTS = {
  discount: 0.2,
  rating: 0.2,
  sales: 0.15,
  commission: 0.15,
  price: 0.1,
  trend: 0.1,
  conversion: 0.1,
} as const;

export type ScoreWeights = typeof DEFAULT_SCORE_WEIGHTS;
