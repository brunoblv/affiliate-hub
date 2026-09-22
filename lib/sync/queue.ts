import { prisma } from "@/lib/db";
import { listConnectors } from "@/lib/connectors";
import { syncConfig } from "./config";
import { cycleStart } from "./cycle";

/**
 * Fila persistente em Postgres. Duas garantias:
 * - um job por oferta em andamento: o INSERT só cria quando não há QUEUED/RUNNING;
 * - lease: um job RUNNING com `lockedUntil` vencido é retomado por outro worker.
 */

const connectorKeys = () => listConnectors().map((connector) => connector.key);

/** Ofertas com conector cuja última coleta bem-sucedida é anterior ao início do ciclo de hoje. */
export async function enqueueDue(now = new Date()): Promise<number> {
  const since = cycleStart(now, syncConfig.startHour);
  const keys = connectorKeys();
  return prisma.$executeRaw`
    INSERT INTO sync_jobs (id, "offerId", status, reason, "scheduledFor", "createdAt")
    SELECT gen_random_uuid()::text, o.id, 'QUEUED', 'SCHEDULED', now(), now()
    FROM offers o
    JOIN stores s ON s.id = o."storeId"
    WHERE o.active AND s.active
      AND s.connector = ANY(${keys})
      AND o."externalListingId" IS NOT NULL
      AND NOT o."needsReview"
      AND (o."priceCheckedAt" IS NULL OR o."priceCheckedAt" < ${since})
      -- Quem falha volta a ser tentado com espera crescente (1 h, 2 h... até 12 h).
      AND (o."lastAttemptAt" IS NULL
           OR o."lastAttemptAt" < now() - make_interval(hours => LEAST(o."consecutiveFailures" + 1, 12)))
      AND NOT EXISTS (
        SELECT 1 FROM sync_jobs j WHERE j."offerId" = o.id AND j.status IN ('QUEUED', 'RUNNING')
      )`;
}

/** Atualização pedida por um admin: ignora o ciclo e a espera das falhas. */
export async function enqueueNow(target: { offerId?: string; storeId?: string }): Promise<number> {
  const keys = connectorKeys();
  const offerId = target.offerId ?? null;
  const storeId = target.storeId ?? null;
  return prisma.$executeRaw`
    INSERT INTO sync_jobs (id, "offerId", status, reason, "scheduledFor", "createdAt")
    SELECT gen_random_uuid()::text, o.id, 'QUEUED', 'MANUAL', now(), now()
    FROM offers o
    JOIN stores s ON s.id = o."storeId"
    WHERE o.active AND s.active
      AND s.connector = ANY(${keys})
      AND o."externalListingId" IS NOT NULL
      AND (${offerId}::text IS NULL OR o.id = ${offerId}::text)
      AND (${storeId}::text IS NULL OR o."storeId" = ${storeId}::text)
      AND NOT EXISTS (
        SELECT 1 FROM sync_jobs j WHERE j."offerId" = o.id AND j.status IN ('QUEUED', 'RUNNING')
      )`;
}

export interface ClaimedJob {
  id: string;
  offerId: string;
  attempts: number;
}

/** Reserva até `limit` jobs prontos (ou com lease vencido). `SKIP LOCKED` evita disputa entre workers. */
export async function claimJobs(limit: number): Promise<ClaimedJob[]> {
  const lease = syncConfig.leaseSeconds;
  return prisma.$queryRaw<ClaimedJob[]>`
    UPDATE sync_jobs
    SET status = 'RUNNING',
        "lockedUntil" = now() + make_interval(secs => ${lease}::double precision),
        "startedAt" = now(),
        attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM sync_jobs
      WHERE (status = 'QUEUED' AND "scheduledFor" <= now())
         OR (status = 'RUNNING' AND "lockedUntil" < now())
      ORDER BY "scheduledFor"
      LIMIT ${limit}::int
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "offerId", attempts`;
}

/** Limpa jobs antigos já concluídos para a tabela não crescer sem limite. */
export async function pruneJobs(days = 14): Promise<number> {
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { count } = await prisma.syncJob.deleteMany({
    where: { status: { in: ["DONE", "FAILED"] }, finishedAt: { lt: before } },
  });
  return count;
}
