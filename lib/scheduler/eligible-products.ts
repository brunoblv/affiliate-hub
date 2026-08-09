import { prisma } from "@/lib/database";
import { EntityStatus, type ScheduleSlot, type Prisma } from "@/lib/generated/prisma/client";
import { CHANNEL_TO_CONTENT_TYPE } from "@/lib/content";

export interface EligibleProduct {
  productId: string;
  totalScore: number;
}

/**
 * Seleciona os produtos elegíveis para um ScheduleSlot (spec §25): dentro da
 * categoria/faixa de preço/desconto/score mínimo configurados, ainda sem
 * conteúdo pendente/aprovado/publicado para o tipo de conteúdo do slot,
 * ordenados por score decrescente.
 */
export async function getEligibleProducts(slot: ScheduleSlot): Promise<EligibleProduct[]> {
  const contentType = slot.contentType ?? CHANNEL_TO_CONTENT_TYPE[slot.channel];

  const where: Prisma.ProductWhereInput = {
    status: EntityStatus.ACTIVE,
    categoryId: slot.categoryId ?? undefined,
    discountPercent: slot.minDiscount ? { gte: slot.minDiscount } : undefined,
    price: {
      gte: slot.minPrice ?? undefined,
      lte: slot.maxPrice ?? undefined,
    },
    contents: {
      none: {
        type: contentType,
        status: { in: ["PENDING_APPROVAL", "APPROVED", "PUBLISHED"] },
      },
    },
  };

  const products = await prisma.product.findMany({
    where,
    include: { scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
    take: 200,
  });

  const minScore = slot.minScore ? Number(slot.minScore) : 0;

  return products
    .filter((p) => p.scores[0] && Number(p.scores[0].totalScore) >= minScore)
    .map((p) => ({ productId: p.id, totalScore: Number(p.scores[0].totalScore) }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, slot.postsPerSlot);
}
