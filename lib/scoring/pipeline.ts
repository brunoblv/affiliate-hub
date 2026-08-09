import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { OpportunityStatus } from "@/lib/generated/prisma/client";
import { calculateProductScore, type ScoreBreakdown } from "./calculate-score";
import { determineOpportunities } from "./opportunities";

export interface RunScoringPipelineOptions {
  /** Marca o produto como recém-importado para fins de OpportunityType.NEW_PRODUCT. */
  isNew?: boolean;
}

export interface RunScoringPipelineResult {
  breakdown: ScoreBreakdown;
  opportunitiesCreated: number;
}

/**
 * Etapa final do Product Ingestor (spec §23): calcula o ProductScore,
 * persiste, e a partir dele decide quais Opportunity abrir — fechando o
 * pipeline Produto → Score → Oportunidade descrito em spec §46.
 *
 * Idempotente por natureza de negócio: não reabre um tipo de oportunidade
 * que já esteja OPEN para o mesmo produto.
 */
export async function runScoringPipeline(
  productId: string,
  options: RunScoringPipelineOptions = {},
): Promise<RunScoringPipelineResult> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const lastPrice = await prisma.productPriceHistory.findFirst({
    where: { productId },
    orderBy: { recordedAt: "desc" },
  });

  const currentPrice = Number(product.price);
  const priceDropPercent =
    lastPrice && Number(lastPrice.price) > currentPrice
      ? ((Number(lastPrice.price) - currentPrice) / Number(lastPrice.price)) * 100
      : undefined;

  if (!lastPrice || Number(lastPrice.price) !== currentPrice) {
    await prisma.productPriceHistory.create({ data: { productId, price: currentPrice } });
  }

  const breakdown = calculateProductScore({
    discountPercent: product.discountPercent ? Number(product.discountPercent) : undefined,
    rating: product.rating ? Number(product.rating) : undefined,
    soldCount: product.soldCount,
    commissionPercent: product.commissionPercent ? Number(product.commissionPercent) : undefined,
    price: Number(product.price),
  });

  await prisma.productScore.create({
    data: {
      productId,
      discountScore: breakdown.discountScore,
      ratingScore: breakdown.ratingScore,
      salesScore: breakdown.salesScore,
      commissionScore: breakdown.commissionScore,
      priceScore: breakdown.priceScore,
      trendScore: breakdown.trendScore,
      conversionScore: breakdown.conversionScore,
      totalScore: breakdown.totalScore,
    },
  });

  const candidates = determineOpportunities(
    {
      discountPercent: product.discountPercent ? Number(product.discountPercent) : undefined,
      rating: product.rating ? Number(product.rating) : undefined,
      soldCount: product.soldCount,
      commissionPercent: product.commissionPercent ? Number(product.commissionPercent) : undefined,
      isNew: options.isNew,
      priceDropPercent,
    },
    breakdown,
  );

  let opportunitiesCreated = 0;

  for (const candidate of candidates) {
    const existing = await prisma.opportunity.findFirst({
      where: { productId, type: candidate.type, status: OpportunityStatus.OPEN },
    });
    if (existing) {
      await prisma.opportunity.update({
        where: { id: existing.id },
        data: { score: candidate.score, reason: candidate.reason },
      });
      continue;
    }

    await prisma.opportunity.create({
      data: {
        productId,
        type: candidate.type,
        score: candidate.score,
        reason: candidate.reason,
        status: OpportunityStatus.OPEN,
      },
    });
    opportunitiesCreated += 1;
  }

  logger.info("PRODUCT_SYNC", `Pipeline de score concluído para produto ${productId}`, {
    totalScore: breakdown.totalScore,
    opportunitiesCreated,
  });

  return { breakdown, opportunitiesCreated };
}
