import "dotenv/config";
import { createProductSyncWorker } from "./products/sync-worker";
import { createProductScoreWorker } from "./products/score-worker";
import { createContentGenerationWorker } from "./content/generation-worker";
import { createPublishWorker } from "./publishing/publish-worker";
import { createAnalyticsSyncWorker } from "./analytics/sync-worker";
import { createAffiliateLinkWorker } from "./affiliate/link-worker";
import { schedulerTick } from "@/lib/scheduler";
import { logger } from "@/lib/logging";

const SCHEDULER_TICK_INTERVAL_MS = 60_000;

/**
 * Processo standalone de workers BullMQ + scheduler.
 * Rodar separadamente do servidor Next.js: `npm run workers`.
 */
function startWorkers() {
  const workers = [
    createProductSyncWorker(),
    createProductScoreWorker(),
    createContentGenerationWorker(),
    createPublishWorker(),
    createAnalyticsSyncWorker(),
    createAffiliateLinkWorker(),
  ];

  console.log(`Workers iniciados: ${workers.length}`);

  const interval = setInterval(() => {
    schedulerTick().catch((error) => logger.error("JOB", "schedulerTick falhou", { error }));
  }, SCHEDULER_TICK_INTERVAL_MS);

  console.log("Scheduler tick ativo (a cada 60s)");

  const shutdown = async () => {
    clearInterval(interval);
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startWorkers();
