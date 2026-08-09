import { Worker } from "bullmq";
import { logger } from "@/lib/logging";

/**
 * Worker da fila `analytics-sync`: consolida cliques/conversões/comissões
 * vindos das plataformas de afiliados (spec §34). Implementação futura —
 * depende dos relatórios reais expostos por Shopee/TikTok.
 */
export function createAnalyticsSyncWorker() {
  return new Worker(
    "analytics-sync",
    async (job) => {
      logger.info("PRODUCT_SYNC", "analytics-sync: execução (stub)", { jobId: job.id });
    },
    { connection: { url: process.env.REDIS_URL } },
  );
}
