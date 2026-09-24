import { cache } from "react";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { qualityPolicy } from "./quality";

/** Observed days in São Paulo, without counting multiple checks on the same day. */
export async function historicalOfferIds(productIds: string[]): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ offerId: string }[]>`
    SELECT p."offerId"
    FROM price_points p
    JOIN offers o ON o.id = p."offerId"
    JOIN product_variants v ON v.id = o."variantId"
    WHERE v."productId" IN (${Prisma.join(productIds)})
      AND p."observedAt" >= ${since}
      AND p."variantId" = v.id
      AND p."itemCondition" = o.condition
      AND p."priceCondition" IS NOT DISTINCT FROM o."priceCondition"
      AND p.availability <> 'OUT_OF_STOCK'
      AND p."priceCents" > 0
    GROUP BY p."offerId"
    HAVING COUNT(DISTINCT (p."observedAt" AT TIME ZONE 'America/Sao_Paulo')::date) >= ${qualityPolicy.minimumHistoryDays}
      AND MAX(p."observedAt") - MIN(p."observedAt") >= INTERVAL '7 days'
  `;
  return new Set(rows.map((row) => row.offerId));
}

export const historicalOfferIdsForProduct = cache(async (productId: string): Promise<Set<string>> =>
  historicalOfferIds([productId]),
);
