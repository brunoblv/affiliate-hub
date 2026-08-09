import type { ScoreBreakdown } from "./calculate-score";
import { OpportunityType } from "@/lib/generated/prisma/client";

export interface OpportunityCandidate {
  type: OpportunityType;
  score: number;
  reason: string;
}

export interface OpportunityInput {
  discountPercent?: number | null;
  rating?: number | null;
  soldCount?: number | null;
  commissionPercent?: number | null;
  isNew?: boolean;
  /** Queda percentual em relação ao último preço registrado no histórico, se houver. */
  priceDropPercent?: number | null;
}

/** Score total mínimo para qualquer oportunidade ser considerada relevante. */
export const MIN_OPPORTUNITY_SCORE = 60;

/**
 * Deriva os tipos de oportunidade aplicáveis a um produto a partir do score
 * calculado e dos seus dados brutos (spec §9). Um produto pode gerar mais de
 * uma oportunidade simultânea (ex.: HIGH_DISCOUNT + HIGH_COMMISSION).
 */
export function determineOpportunities(input: OpportunityInput, breakdown: ScoreBreakdown): OpportunityCandidate[] {
  if (breakdown.totalScore < MIN_OPPORTUNITY_SCORE) return [];

  const candidates: OpportunityCandidate[] = [];

  if (input.isNew) {
    candidates.push({
      type: OpportunityType.NEW_PRODUCT,
      score: breakdown.totalScore,
      reason: "Produto recém-importado com score relevante.",
    });
  }

  if ((input.priceDropPercent ?? 0) >= 5) {
    candidates.push({
      type: OpportunityType.PRICE_DROP,
      score: breakdown.totalScore,
      reason: `Preço caiu ${input.priceDropPercent?.toFixed(0)}% desde a última sincronização.`,
    });
  }

  if ((input.discountPercent ?? 0) >= 30) {
    candidates.push({
      type: OpportunityType.HIGH_DISCOUNT,
      score: breakdown.totalScore,
      reason: `Desconto atual de ${input.discountPercent}%.`,
    });
  }

  if ((input.soldCount ?? 0) >= 1000) {
    candidates.push({
      type: OpportunityType.HIGH_SALES,
      score: breakdown.totalScore,
      reason: `${input.soldCount?.toLocaleString("pt-BR")} unidades vendidas.`,
    });
  }

  if ((input.commissionPercent ?? 0) >= 10) {
    candidates.push({
      type: OpportunityType.HIGH_COMMISSION,
      score: breakdown.totalScore,
      reason: `Comissão de ${input.commissionPercent}%, acima da média.`,
    });
  }

  if (breakdown.conversionScore >= 70) {
    candidates.push({
      type: OpportunityType.HIGH_CONVERSION,
      score: breakdown.totalScore,
      reason: "Taxa de conversão histórica acima da média.",
    });
  }

  if (breakdown.trendScore >= 70) {
    candidates.push({
      type: OpportunityType.TRENDING,
      score: breakdown.totalScore,
      reason: "Tendência de alta em vendas/cliques recentes.",
    });
  }

  return candidates;
}
