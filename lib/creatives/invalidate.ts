import { prisma } from "@/lib/db";
import { getProductsByIds } from "@/lib/catalog";
import { money } from "@/lib/format";

/**
 * Capas que mostram preço deixam de valer quando o menor preço atual muda (ou some).
 * Só as ainda não publicadas: uma capa já enviada é registro do valor daquele momento e não é tocada.
 * Chamada logo depois de qualquer mudança de preço e, por garantia, periodicamente pelo worker.
 */
export async function invalidateOutdatedCreatives(productId?: string): Promise<number> {
  const creatives = await prisma.creative.findMany({
    where: { withPrice: true, status: { in: ["PENDING_APPROVAL", "APPROVED"] }, ...(productId ? { productId } : {}) },
  });
  if (creatives.length === 0) return 0;

  const products = await getProductsByIds([...new Set(creatives.map((creative) => creative.productId))]);
  let invalidated = 0;

  for (const creative of creatives) {
    const current = products.get(creative.productId)?.prices.lowestCents ?? null;
    if (current === creative.priceCents) continue;
    const reason =
      current === null
        ? "O produto ficou sem oferta atual."
        : `O menor preço mudou de ${money(creative.priceCents ?? 0)} para ${money(current)}.`;
    // Condicional no status: nunca invalida uma capa que acabou de ser publicada em paralelo.
    const result = await prisma.creative.updateMany({
      where: { id: creative.id, status: { in: ["PENDING_APPROVAL", "APPROVED"] } },
      data: { status: "INVALIDATED", invalidatedReason: reason },
    });
    invalidated += result.count;
  }
  return invalidated;
}
