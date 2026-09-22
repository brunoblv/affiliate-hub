import { prisma } from "@/lib/db";
import { getConnector, listConnectors } from "@/lib/connectors";
import { syncConfig } from "./config";
import { cycleStart } from "./cycle";

const HOUR = 60 * 60 * 1000;

/** Ofertas que o worker acompanha: ativas, de loja ativa com conector e com ID externo. */
const MONITORED = {
  active: true,
  externalListingId: { not: null },
  store: { active: true, connector: { in: listConnectors().map((c) => c.key) } },
} as const;

export async function getSyncOverview(now = new Date()) {
  const since = cycleStart(now, syncConfig.startHour);
  const expiredBefore = new Date(now.getTime() - 24 * HOUR);

  const [heartbeat, monitored, updated, queued, running, failed, stale, expired, review, lastFinished, stores, jobs] =
    await Promise.all([
      prisma.workerHeartbeat.findUnique({ where: { id: "worker" } }),
      prisma.offer.count({ where: MONITORED }),
      prisma.offer.count({ where: { ...MONITORED, priceCheckedAt: { gte: since } } }),
      prisma.syncJob.count({ where: { status: "QUEUED" } }),
      prisma.syncJob.count({ where: { status: "RUNNING" } }),
      prisma.offer.count({ where: { ...MONITORED, status: "ERROR" } }),
      prisma.offer.count({ where: { ...MONITORED, status: "STALE" } }),
      prisma.offer.count({ where: { ...MONITORED, OR: [{ priceCheckedAt: null }, { priceCheckedAt: { lt: expiredBefore } }] } }),
      prisma.offer.count({ where: { ...MONITORED, needsReview: true } }),
      prisma.syncJob.findFirst({ where: { finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
      prisma.store.findMany({
        where: { connector: { not: null } },
        orderBy: { name: "asc" },
        include: {
          offers: { where: { active: true }, select: { status: true, priceCheckedAt: true, needsReview: true } },
        },
      }),
      prisma.syncJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { offer: { include: { store: true, variant: { include: { product: { select: { name: true } } } } } } },
      }),
    ]);

  const workerAlive = heartbeat ? now.getTime() - heartbeat.lastSeenAt.getTime() < 90_000 : false;

  return {
    cycleStart: since,
    worker: { alive: workerAlive, lastSeenAt: heartbeat?.lastSeenAt ?? null, startedAt: heartbeat?.startedAt ?? null },
    totals: { monitored, updated, queued, running, failed, stale, expired, review },
    lastRunAt: lastFinished?.finishedAt ?? null,
    stores: stores.map((store) => {
      const connector = getConnector(store.connector);
      const lastOk = store.offers.reduce<Date | null>(
        (latest, offer) => (offer.priceCheckedAt && (!latest || offer.priceCheckedAt > latest) ? offer.priceCheckedAt : latest),
        null,
      );
      return {
        id: store.id,
        name: store.name,
        active: store.active,
        connectorLabel: connector?.label ?? `${store.connector} (sem implementação)`,
        configured: connector?.isConfigured() ?? false,
        offerCount: store.offers.length,
        failing: store.offers.filter((offer) => offer.status !== "ACTIVE").length,
        review: store.offers.filter((offer) => offer.needsReview).length,
        lastOk,
      };
    }),
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      reason: job.reason,
      attempts: job.attempts,
      scheduledFor: job.scheduledFor,
      finishedAt: job.finishedAt,
      error: job.error,
      outcome: (job.result as { outcome?: string } | null)?.outcome ?? null,
      offerId: job.offerId,
      label: `${job.offer.variant.product.name} · ${job.offer.sellerName}`,
      store: job.offer.store.name,
    })),
  };
}

/** Ofertas que pedem atenção humana: valor em revisão e ofertas com erro ou sem encontrar o anúncio. */
export async function getSyncPending() {
  const [review, problems] = await Promise.all([
    prisma.offer.findMany({
      where: { ...MONITORED, needsReview: true },
      include: { store: true, variant: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { lastAttemptAt: "desc" },
    }),
    prisma.offer.findMany({
      where: { ...MONITORED, status: { in: ["ERROR", "STALE"] }, needsReview: false },
      include: { store: true, variant: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { lastAttemptAt: "desc" },
      take: 50,
    }),
  ]);
  return { review, problems };
}
