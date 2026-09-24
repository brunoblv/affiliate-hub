import { prisma } from "@/lib/db";
import { fillMetricDays, metricRange } from "./report";

export async function metricsDashboard(rawDays?: string) {
  const range = metricRange(rawDays);
  const createdAt = { gte: range.start, lt: range.end };
  return prisma.$transaction(async (tx) => {
    const [searches, noResults, views, offerClicks, communityClicks, terms, emptyTerms, products, offers, communities, daily] = await Promise.all([
      tx.metricEvent.count({ where: { createdAt, kind: "SEARCH" } }),
      tx.metricEvent.count({ where: { createdAt, kind: "SEARCH", resultCount: 0 } }),
      tx.metricEvent.count({ where: { createdAt, kind: "PRODUCT_VIEW" } }),
      tx.click.count({ where: { createdAt } }),
      tx.communityClick.count({ where: { createdAt } }),
      tx.metricEvent.groupBy({ by: ["term"], where: { createdAt, kind: "SEARCH" }, _count: { id: true }, orderBy: [{ _count: { id: "desc" } }, { term: "asc" }], take: 10 }),
      tx.metricEvent.groupBy({ by: ["term"], where: { createdAt, kind: "SEARCH", resultCount: 0 }, _count: { id: true }, orderBy: [{ _count: { id: "desc" } }, { term: "asc" }], take: 10 }),
      tx.metricEvent.groupBy({ by: ["productId"], where: { createdAt, kind: "PRODUCT_VIEW", productId: { not: null } }, _count: { id: true }, orderBy: [{ _count: { id: "desc" } }, { productId: "asc" }], take: 10 }),
      tx.click.groupBy({ by: ["offerId", "productId", "storeId"], where: { createdAt }, _count: { id: true }, orderBy: [{ _count: { id: "desc" } }, { offerId: "asc" }], take: 10 }),
      tx.communityClick.groupBy({ by: ["communityId", "nicheId"], where: { createdAt }, _count: { id: true }, orderBy: [{ _count: { id: "desc" } }, { communityId: "asc" }, { nicheId: "asc" }], take: 10 }),
      tx.$queryRaw<{ day: string; kind: string; count: bigint }[]>`
        SELECT to_char(timezone('America/Sao_Paulo', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
               kind, count(*) AS count
        FROM (
          SELECT "createdAt", kind::text AS kind FROM metric_events WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
          UNION ALL
          SELECT "createdAt", 'NO_RESULTS' AS kind FROM metric_events WHERE kind = 'SEARCH' AND "resultCount" = 0 AND "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
          UNION ALL
          SELECT "createdAt", 'OFFER_CLICK' AS kind FROM clicks WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
          UNION ALL
          SELECT "createdAt", 'COMMUNITY_CLICK' AS kind FROM community_clicks WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
        ) events GROUP BY day, kind ORDER BY day, kind`,
    ]);
    const [productNames, storeNames, communityNames, nicheNames] = await Promise.all([
      tx.product.findMany({ where: { id: { in: [...products.map((row) => row.productId), ...offers.map((row) => row.productId)].filter((id): id is string => !!id) } }, select: { id: true, name: true } }),
      tx.store.findMany({ where: { id: { in: offers.map((row) => row.storeId).filter((id): id is string => !!id) } }, select: { id: true, name: true } }),
      tx.community.findMany({ where: { id: { in: communities.map((row) => row.communityId) } }, select: { id: true, name: true } }),
      tx.niche.findMany({ where: { id: { in: communities.map((row) => row.nicheId) } }, select: { id: true, name: true } }),
    ]);
    const name = (rows: { id: string; name: string }[], id: string | null, fallback: string) => rows.find((row) => row.id === id)?.name ?? fallback;
    return { ...range, searches, noResults, views, offerClicks, communityClicks,
      terms: terms.map((row) => ({ label: row.term || "Sem termo (navegação/filtros)", count: row._count.id })),
      emptyTerms: emptyTerms.map((row) => ({ label: row.term || "Sem termo (navegação/filtros)", count: row._count.id })),
      products: products.map((row) => ({ label: name(productNames, row.productId, "Produto retirado"), detail: row.productId ?? "Sem identificação", count: row._count.id })),
      offers: offers.map((row) => ({ label: name(productNames, row.productId, "Produto retirado ou não identificado"), detail: `${name(storeNames, row.storeId, "Loja não identificada")} · Oferta ${row.offerId ?? "não identificada"}`, count: row._count.id })),
      communities: communities.map((row) => ({ label: name(communityNames, row.communityId, "Comunidade retirada"), detail: name(nicheNames, row.nicheId, "Nicho retirado"), count: row._count.id })),
      daily: fillMetricDays(range.start, range.days, daily.map((row) => ({ ...row, count: Number(row.count) }))),
    };
  }, { isolationLevel: "RepeatableRead", timeout: 15000 });
}
