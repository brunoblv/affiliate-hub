import { prisma } from "@/lib/database";
import { EntityStatus, type AutopilotRule, type Prisma } from "@/lib/generated/prisma/client";
import { CHANNEL_TO_CONTENT_TYPE } from "@/lib/content";

export interface EligibleProduct {
  productId: string;
  totalScore: number;
}

/**
 * Seleciona produtos elegíveis para uma AutopilotRule (spec §28): dentro dos
 * limites de score/desconto/avaliação/comissão/vendas/preço, respeitando
 * categorias permitidas/bloqueadas, sem conteúdo já gerado para o canal da
 * regra — ordenados por score decrescente.
 */
export async function getEligibleProducts(rule: AutopilotRule, limit: number): Promise<EligibleProduct[]> {
  if (limit <= 0) return [];

  const allowedCategoryIds = (rule.allowedCategoryIds as string[] | null) ?? undefined;
  const blockedCategoryIds = (rule.blockedCategoryIds as string[] | null) ?? undefined;

  const where: Prisma.ProductWhereInput = {
    status: EntityStatus.ACTIVE,
    discountPercent: rule.minDiscount ? { gte: rule.minDiscount } : undefined,
    rating: rule.minRating ? { gte: rule.minRating } : undefined,
    commissionPercent: rule.minCommission ? { gte: rule.minCommission } : undefined,
    soldCount: rule.minSales ? { gte: rule.minSales } : undefined,
    price: { gte: rule.minPrice ?? undefined, lte: rule.maxPrice ?? undefined },
    categoryId: allowedCategoryIds?.length
      ? { in: allowedCategoryIds }
      : blockedCategoryIds?.length
        ? { notIn: blockedCategoryIds }
        : undefined,
    contents: {
      none: {
        type: CHANNEL_TO_CONTENT_TYPE[rule.channel],
        status: { in: ["PENDING_APPROVAL", "APPROVED", "PUBLISHED"] },
      },
    },
  };

  const products = await prisma.product.findMany({
    where,
    include: { scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
    take: 200,
  });

  const minScore = rule.minScore ? Number(rule.minScore) : 0;

  return products
    .filter((p) => p.scores[0] && Number(p.scores[0].totalScore) >= minScore)
    .map((p) => ({ productId: p.id, totalScore: Number(p.scores[0].totalScore) }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
}
