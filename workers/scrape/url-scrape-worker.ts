import { Worker } from "bullmq";
import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { scrapeUrlAndSaveProduct, closeScrapeBrowser } from "@/lib/scrape";

/**
 * Worker da fila `url-scrape`: abre cada URL com Playwright, extrai dados do
 * produto e faz upsert no banco. Concurrency 1 para espaçar acessos.
 */
export function createUrlScrapeWorker() {
  const worker = new Worker(
    "url-scrape",
    async (job) => {
      const { dbJobId, projectId, url, categoryId } = job.data as {
        dbJobId?: string;
        projectId: string;
        url: string;
        categoryId?: string;
      };

      if (dbJobId) {
        await prisma.job.update({
          where: { id: dbJobId },
          data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
        });
      }

      try {
        const result = await scrapeUrlAndSaveProduct({ projectId, url, categoryId });

        if (dbJobId) {
          await prisma.job.update({
            where: { id: dbJobId },
            data: {
              status: "COMPLETED",
              finishedAt: new Date(),
              result: result as unknown as object,
            },
          });
        }

        logger.info("PRODUCT_SYNC", "URL scrape salva no banco", { url, ...result });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (dbJobId) {
          await prisma.job.update({
            where: { id: dbJobId },
            data: { status: "FAILED", finishedAt: new Date(), error: message },
          });
        }
        throw error;
      }
    },
    {
      connection: { url: process.env.REDIS_URL },
      concurrency: 1,
    },
  );

  worker.on("closed", () => {
    closeScrapeBrowser().catch(() => undefined);
  });

  return worker;
}
