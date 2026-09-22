/**
 * Worker de atualização de preços (RF-08). Roda FORA do site:
 *   npm run worker      -> fica rodando (ciclo diário + fila)
 *   npm run sync:once   -> agenda o que está vencido, esvazia a fila e sai
 *
 * Pode ser reiniciado a qualquer momento: a fila é persistente e um job que ficou
 * "em andamento" volta sozinho quando o lease vence, sem duplicar observações.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { claimJobs, enqueueDue, pruneJobs } from "@/lib/sync/queue";
import { processJob } from "@/lib/sync/run";
import { syncConfig } from "@/lib/sync/config";
import { listConnectors } from "@/lib/connectors";
import { evaluateAlerts } from "@/lib/alerts/notify";
import { isMailConfigured } from "@/lib/mail";
import { verifyImages } from "@/lib/images/check";
import { invalidateOutdatedCreatives } from "@/lib/creatives/invalidate";

const once = process.argv.includes("--once");
const startedAt = new Date();
let stopping = false;

const log = (message: string, data: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), message, ...data }));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function heartbeat() {
  await prisma.workerHeartbeat.upsert({
    where: { id: "worker" },
    create: { id: "worker", startedAt, lastSeenAt: new Date(), info: { pid: process.pid, concurrency: syncConfig.concurrency } },
    update: { lastSeenAt: new Date(), info: { pid: process.pid, concurrency: syncConfig.concurrency } },
  });
}

async function drainBatch(): Promise<number> {
  const jobs = await claimJobs(syncConfig.concurrency);
  await Promise.all(
    jobs.map(async (job) => {
      const outcome = await processJob(job.id).catch((error) => ({
        kind: "crash" as const,
        message: error instanceof Error ? error.message : String(error),
      }));
      log("job", { jobId: job.id, offerId: job.offerId, attempt: job.attempts, outcome: outcome.kind });
    }),
  );
  return jobs.length;
}

async function runAlerts() {
  try {
    const invalidated = await invalidateOutdatedCreatives();
    if (invalidated > 0) log("capas com preço vencido invalidadas", { invalidated });
    const result = await evaluateAlerts();
    if (result.sent || result.rearmed || result.failed) log("alertas", { ...result });
    return result;
  } catch (error) {
    // Um erro pontual (banco, e-mail) não pode derrubar a coleta de preços.
    log("erro ao avaliar alertas", { erro: error instanceof Error ? error.message : String(error) });
    return { sent: 0, rearmed: 0, failed: 0, waitingForMail: 0 };
  }
}

async function main() {
  log("e-mail dos alertas", { configurado: isMailConfigured() });
  for (const connector of listConnectors()) {
    log("conector", { key: connector.key, configurado: connector.isConfigured() });
  }
  log("worker iniciado", { once, ...syncConfig });

  let lastSchedule = 0;
  let lastPrune = 0;
  let lastAlerts = 0;
  let lastImages = 0;
  let warnedMail = false;

  while (!stopping) {
    await heartbeat();

    if (Date.now() - lastSchedule > 60_000 || lastSchedule === 0) {
      const created = await enqueueDue();
      lastSchedule = Date.now();
      if (created > 0) log("agendado", { jobs: created });
    }
    if (Date.now() - lastPrune > 6 * 60 * 60 * 1000) {
      lastPrune = Date.now();
      const removed = await pruneJobs();
      if (removed > 0) log("jobs antigos removidos", { removed });
    }

    const worked = await drainBatch();

    // Fotos: confere as vencidas de tempos em tempos (URL de loja expira).
    if (Date.now() - lastImages > 30 * 60 * 1000) {
      lastImages = Date.now();
      try {
        const images = await verifyImages();
        if (images.checked > 0) log("fotos conferidas", { ...images });
      } catch (error) {
        log("erro ao conferir fotos", { erro: error instanceof Error ? error.message : String(error) });
      }
    }

    // Preços mudaram (ou já é hora de olhar de novo): confere os alertas.
    if (worked > 0 || Date.now() - lastAlerts > 60_000) {
      lastAlerts = Date.now();
      const alerts = await runAlerts();
      if (alerts.waitingForMail > 0 && !warnedMail) {
        warnedMail = true;
        log("alertas na meta aguardando e-mail configurado", { alertas: alerts.waitingForMail });
      }
    }

    if (worked === 0) {
      if (once) {
        // Jobs futuros (nova tentativa com espera) não travam o modo --once.
        break;
      }
      await sleep(syncConfig.pollMs);
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    log("encerrando", { signal });
    stopping = true;
  });
}

main()
  .catch((error) => {
    log("worker falhou", { erro: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
