import { Worker } from "bullmq";
import { runScoringPipeline } from "@/lib/scoring";

/**
 * Worker da fila `product-score`: recalcula o ProductScore de um produto e,
 * a partir dele, abre/atualiza as Opportunity aplicáveis (spec §8/§9).
 */
export function createProductScoreWorker() {
  return new Worker(
    "product-score",
    async (job) => {
      const { productId, isNew } = job.data as { productId: string; isNew?: boolean };
      return runScoringPipeline(productId, { isNew });
    },
    { connection: { url: process.env.REDIS_URL } },
  );
}
