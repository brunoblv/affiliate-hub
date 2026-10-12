import { prisma } from "@/lib/db";
import { loadStoreDeals } from "@/lib/catalog";
import { saoPauloDate } from "@/lib/discovery/day";
import { pickEntries, type Kind } from "./select";

export const KINDS: Kind[] = ["ACHADOS", "MAIS_VENDIDOS", "MELHORES_OFERTAS", "NOVIDADES"];

/**
 * Monta a seleção do dia (B.3). Idempotente por (loja, recorte, dia): quem já tem entradas hoje
 * não é refeito nem embaralhado, então rodar duas vezes não duplica e dois F5 mostram o mesmo.
 */
export async function buildShowcases(options: { now?: Date; storeId?: string } = {}): Promise<{ created: number }> {
  const now = options.now ?? new Date();
  const date = saoPauloDate(now);
  const deals = (await loadStoreDeals()).filter((deal) => !options.storeId || deal.item.storeId === options.storeId);
  const storeIds = [...new Set(deals.map((deal) => deal.item.storeId))];
  if (storeIds.length === 0) return { created: 0 };

  const stores = await prisma.store.findMany({ where: { id: { in: storeIds }, active: true }, select: { id: true, name: true } });
  let created = 0;
  for (const store of stores) {
    const items = deals.filter((deal) => deal.item.storeId === store.id).map((deal) => deal.item);
    for (const kind of KINDS) {
      const already = await prisma.showcaseEntry.count({ where: { storeId: store.id, kind, day: date } });
      if (already > 0) continue;
      const entries = pickEntries(kind, items, { storeName: store.name, now });
      if (entries.length === 0) continue;
      const result = await prisma.showcaseEntry.createMany({
        data: entries.map(({ item, reason }, position) => ({
          storeId: store.id,
          kind,
          day: date,
          position,
          productId: item.productId,
          offerId: item.offerId,
          variantId: item.variantId,
          priceCents: item.priceCents,
          priceObservedAt: item.priceObservedAt,
          reason,
        })),
        skipDuplicates: true,
      });
      created += result.count;
    }
  }
  return { created };
}

/** Entradas de dias passados já não servem: limpa o que tem mais de 14 dias. */
export async function pruneShowcases(now = new Date()): Promise<number> {
  const limit = saoPauloDate(new Date(now.getTime() - 14 * 86_400_000));
  return (await prisma.showcaseEntry.deleteMany({ where: { day: { lt: limit } } })).count;
}
