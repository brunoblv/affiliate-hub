import { Worker } from "bullmq";
import { shopeeClient } from "@/lib/shopee";
import { tiktokClient } from "@/lib/tiktok";
import { mercadoLivreClient } from "@/lib/mercado-livre";
import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { getQueue } from "@/workers/queues";
import type { AffiliatePlatformClient } from "@/lib/integrations/types";

const CLIENTS_BY_PLATFORM: Record<"SHOPEE" | "TIKTOK_SHOP" | "MERCADO_LIVRE", AffiliatePlatformClient> = {
  SHOPEE: shopeeClient,
  TIKTOK_SHOP: tiktokClient,
  MERCADO_LIVRE: mercadoLivreClient,
};

/**
 * Worker da fila `product-sync`: importa/atualiza produtos das plataformas
 * conectadas, evita duplicatas via (source, externalId) — spec §23 — e
 * encadeia a fila `product-score` para cada produto afetado, fechando o
 * pipeline Produto → Score → Oportunidade (spec §46).
 */
export function createProductSyncWorker() {
  return new Worker(
    "product-sync",
    async (job) => {
      const { platform } = job.data as { platform: keyof typeof CLIENTS_BY_PLATFORM };

      const client = CLIENTS_BY_PLATFORM[platform];
      await client.authenticate();
      const products = await client.searchProducts();

      const scoreQueue = getQueue("product-score");

      for (const p of products) {
        const existing = await prisma.product.findUnique({
          where: { source_externalId: { source: p.source, externalId: p.externalId } },
          select: { id: true },
        });

        const saved = await prisma.product.upsert({
          where: { source_externalId: { source: p.source, externalId: p.externalId } },
          create: {
            source: p.source,
            externalId: p.externalId,
            name: p.name,
            slug: `${p.source.toLowerCase()}-${p.externalId}`,
            description: p.description,
            brand: p.brand,
            imageUrl: p.imageUrl,
            productUrl: p.productUrl,
            price: p.price,
            originalPrice: p.originalPrice,
            rating: p.rating,
            reviewCount: p.reviewCount,
            soldCount: p.soldCount,
            commissionPercent: p.commissionPercent,
            commissionValue: p.commissionValue,
            currency: p.currency ?? "BRL",
          },
          update: {
            name: p.name,
            price: p.price,
            originalPrice: p.originalPrice,
            rating: p.rating,
            reviewCount: p.reviewCount,
            soldCount: p.soldCount,
            commissionPercent: p.commissionPercent,
            commissionValue: p.commissionValue,
          },
        });

        await scoreQueue.add("calculate-score", { productId: saved.id, isNew: !existing });
      }

      logger.info("PRODUCT_SYNC", `${platform}: ${products.length} produtos sincronizados`);
      return { count: products.length };
    },
    { connection: { url: process.env.REDIS_URL } },
  );
}
