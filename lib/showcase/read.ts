import { prisma } from "@/lib/db";
import { loadStoreDeals, listStores, type StoreDealItem } from "@/lib/catalog";
import { saoPauloDate } from "@/lib/discovery/day";
import { metricsAreFresh } from "@/lib/discovery/metrics";
import { buildShowcases } from "./build";
import { SHOWCASE_LIMIT, SHOWCASE_MIN_VISIBLE, stillValid, type Kind } from "./select";

/**
 * Leitura pública das vitrines. Regras: a página reconfere cada entrada congelada contra o
 * catálogo vivo (sai quem perdeu elegibilidade ou subiu de preço) e esconde a seção que ficar com
 * menos de 4 entradas, em vez de completá-la com outro recorte.
 */
export interface ShowcaseCard {
  deal: StoreDealItem;
  reason: string;
}

export interface ShowcaseSection {
  kind: Kind;
  title: string;
  cards: ShowcaseCard[];
  /** Quando a seleção congelada do dia foi montada (só nos recortes congelados). */
  builtAt: Date | null;
}

export const SECTION_TITLES: Record<Kind, string> = {
  ACHADOS: "Achados de hoje",
  MAIS_VENDIDOS: "Mais vendidos",
  MELHORES_OFERTAS: "Melhores ofertas",
  NOVIDADES: "Novidades",
};

export interface StoreShowcase {
  store: { id: string; slug: string; name: string; tagline: string | null; about: string | null };
  sections: ShowcaseSection[];
  branded: ShowcaseCard[];
  generic: ShowcaseCard[];
  /** Produtos com oferta pública nesta loja (elegíveis para o índice e para o sitemap). */
  productCount: number;
}

/** Só indexa com produtos suficientes; abaixo disso, noindex. */
export const MIN_INDEXABLE_PRODUCTS = 12;

function strongest(deals: StoreDealItem[], now: Date, limit = SHOWCASE_LIMIT): StoreDealItem[] {
  return [...deals]
    .sort(
      (a, b) =>
        Number(metricsAreFresh(b.metricsCheckedAt, now)) * (b.salesCount ?? 0) -
          Number(metricsAreFresh(a.metricsCheckedAt, now)) * (a.salesCount ?? 0) ||
        b.item.offerCreatedAt.getTime() - a.item.offerCreatedAt.getTime(),
    )
    .slice(0, limit);
}

export async function getStoreShowcase(slug: string, now = new Date()): Promise<StoreShowcase | null> {
  const stores = await listStores();
  const row = await prisma.store.findUnique({ where: { slug } });
  if (!row || !row.active || !stores.some((store) => store.id === row.id)) return null;

  const deals = (await loadStoreDeals()).filter((deal) => deal.item.storeId === row.id);
  const live = new Map(deals.map((deal) => [deal.item.offerId, deal]));
  const livePrices = new Map(deals.map((deal) => [deal.item.offerId, { priceCents: deal.item.priceCents }]));
  const date = saoPauloDate(now);

  let entries = await prisma.showcaseEntry.findMany({ where: { storeId: row.id, day: date }, orderBy: [{ kind: "asc" }, { position: "asc" }] });
  if (entries.length === 0 && deals.length > 0) {
    // Primeiro acesso do dia antes de o worker montar: monta agora (idempotente) e congela.
    await buildShowcases({ now, storeId: row.id }).catch(() => undefined);
    entries = await prisma.showcaseEntry.findMany({ where: { storeId: row.id, day: date }, orderBy: [{ kind: "asc" }, { position: "asc" }] });
  }

  const sections: ShowcaseSection[] = (["ACHADOS", "MAIS_VENDIDOS", "MELHORES_OFERTAS", "NOVIDADES"] as const).flatMap((kind) => {
    const own = entries.filter((entry) => entry.kind === kind);
    const cards = own.flatMap((entry) => {
      const deal = live.get(entry.offerId);
      return deal && stillValid(entry, livePrices) ? [{ deal, reason: entry.reason }] : [];
    });
    if (cards.length < SHOWCASE_MIN_VISIBLE) return [];
    const builtAt = own.reduce<Date | null>((first, entry) => (first === null || entry.createdAt < first ? entry.createdAt : first), null);
    return [{ kind, title: SECTION_TITLES[kind], cards, builtAt }];
  });

  const tierCards = (tier: "BRANDED" | "GENERIC") => {
    const picked = strongest(deals.filter((deal) => deal.tier === tier), now);
    return picked.length < SHOWCASE_MIN_VISIBLE ? [] : picked.map((deal) => ({ deal, reason: "" }));
  };

  return {
    store: { id: row.id, slug: row.slug, name: row.name, tagline: row.tagline, about: row.about },
    sections,
    branded: tierCards("BRANDED"),
    generic: tierCards("GENERIC"),
    productCount: deals.length,
  };
}

/** Índice das lojas, com contagem real de produtos com oferta pública. */
export async function listStoreIndex(): Promise<{ slug: string; name: string; tagline: string | null; productCount: number }[]> {
  const stores = await listStores();
  if (stores.length === 0) return [];
  const [rows, deals] = await Promise.all([
    prisma.store.findMany({ where: { id: { in: stores.map((store) => store.id) } }, select: { id: true, slug: true, name: true, tagline: true } }),
    loadStoreDeals(),
  ]);
  const counts = new Map<string, number>();
  for (const deal of deals) counts.set(deal.item.storeId, (counts.get(deal.item.storeId) ?? 0) + 1);
  return rows
    .map((row) => ({ slug: row.slug, name: row.name, tagline: row.tagline, productCount: counts.get(row.id) ?? 0 }))
    .filter((row) => row.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount);
}

/** Vitrines temáticas de todas as lojas: /marcas e /achadinhos. */
export async function listTierCards(
  tier: "BRANDED" | "GENERIC",
  options: { minRatingCentis?: number; limit?: number } = {},
  now = new Date(),
): Promise<{ deal: StoreDealItem; storeName: string }[]> {
  const deals = (await loadStoreDeals()).filter((deal) => deal.tier === tier);
  const filtered = options.minRatingCentis
    ? deals.filter(
        (deal) =>
          deal.ratingCentis !== null && deal.ratingCentis >= options.minRatingCentis! && metricsAreFresh(deal.metricsCheckedAt, now),
      )
    : deals;
  const picked = strongest(filtered, now, options.limit ?? 48);
  const stores = await prisma.store.findMany({ where: { id: { in: [...new Set(picked.map((deal) => deal.item.storeId))] } }, select: { id: true, name: true } });
  const names = new Map(stores.map((store) => [store.id, store.name]));
  return picked.map((deal) => ({ deal, storeName: names.get(deal.item.storeId) ?? "loja" }));
}
