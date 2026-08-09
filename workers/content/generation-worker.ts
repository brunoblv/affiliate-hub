import { Worker } from "bullmq";
import { generateContentForProduct } from "@/lib/content";
import type { Channel } from "@/lib/generated/prisma/client";

/** Worker da fila `content-generation`: gera Content a partir de um Product + canal. */
export function createContentGenerationWorker() {
  return new Worker(
    "content-generation",
    async (job) => {
      const { productId, channel, campaignId } = job.data as {
        productId: string;
        channel: Channel;
        campaignId?: string;
      };

      const content = await generateContentForProduct({ productId, channel, campaignId });
      return { contentId: content.id };
    },
    { connection: { url: process.env.REDIS_URL } },
  );
}
