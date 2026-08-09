import { Worker } from "bullmq";
import { prisma } from "@/lib/database";
import { shopeeClient } from "@/lib/shopee";
import { tiktokClient } from "@/lib/tiktok";
import { logger } from "@/lib/logging";

/** Worker da fila `affiliate-sync`: gera/atualiza AffiliateLink de um produto. */
export function createAffiliateLinkWorker() {
  return new Worker(
    "affiliate-sync",
    async (job) => {
      const { productId, channel, subId } = job.data as {
        productId: string;
        channel: "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TELEGRAM" | "WEBSITE" | "BLOG" | "PINTEREST" | "OUTROS";
        subId?: string;
      };

      const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
      const client = product.source === "SHOPEE" ? shopeeClient : tiktokClient;

      const affiliateUrl = await client.generateAffiliateLink(product.externalId, subId);

      const link = await prisma.affiliateLink.create({
        data: { productId, platform: product.source, channel, affiliateUrl, subId },
      });

      logger.info("AFFILIATE_SYNC", `Link de afiliado criado para produto ${productId}`, { linkId: link.id, channel });
      return { linkId: link.id };
    },
    { connection: { url: process.env.REDIS_URL } },
  );
}
