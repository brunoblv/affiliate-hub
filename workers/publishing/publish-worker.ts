import { Worker } from "bullmq";
import { executePublication } from "@/lib/publishing";

/** Worker da fila `publication`: publica um Content em um canal (spec §18/§19). */
export function createPublishWorker() {
  return new Worker(
    "publication",
    async (job) => {
      const { publicationId } = job.data as { publicationId: string };
      await executePublication(publicationId);
    },
    { connection: { url: process.env.REDIS_URL } },
  );
}
