import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { Platform, type Prisma } from "@/lib/generated/prisma/client";
import { mercadoLivreClient } from "@/lib/mercado-livre";
import { tiktokClient } from "@/lib/tiktok";
import { runScoringPipeline } from "@/lib/scoring";
import type { AffiliatePlatformClient, NormalizedProduct } from "@/lib/integrations/types";
import { ACHADINHOS_TIKTOK_PROJECT_SLUG, DISCOVERY_BUCKETS, PROMOTION_SWEEP_TERMS } from "./buckets";
import { classifyPromotionBucket } from "./classify";
import { isBlocked } from "./blocklist";

const CLIENTS: AffiliatePlatformClient[] = [mercadoLivreClient, tiktokClient];

/** Regras de preço mínimo/máximo (spec §20) — configuráveis via Setting("discoveryRules"). */
async function getPriceRules(): Promise<{ minPrice: number; maxPrice: number }> {
  const setting = await prisma.setting.findUnique({ where: { key: "discoveryRules" } });
  const value = (setting?.value as { minPrice?: number; maxPrice?: number } | undefined) ?? {};
  return { minPrice: value.minPrice ?? 20, maxPrice: value.maxPrice ?? 2000 };
}

function computeDiscountPercent(price: number, originalPrice?: number): number | undefined {
  if (!originalPrice || originalPrice <= price) return undefined;
  return Math.round(((originalPrice - price) / originalPrice) * 100 * 100) / 100;
}

export interface DiscoveryRunSummary {
  found: number;
  createdNew: number;
  promotions: number;
  opportunitiesCreated: number;
  ignored: number;
  errors: number;
  byPlatform: Record<string, number>;
}

interface DiscoveryTask {
  projectId: string;
  bucketLabel: string;
  client: AffiliatePlatformClient;
  query: string;
  categorySlug?: string;
}

/**
 * Motor de descoberta (docs/especificacao-automacao-produtos-chartfm.md §2/§23
 * job `product-discovery`): busca produtos no Mercado Livre e no TikTok Shop
 * (quando conectados) para cada bucket de categoria + uma varredura genérica
 * de promoções, normaliza, deduplica por (source, externalId), aplica
 * bloqueios e regras de preço, salva e roda o pipeline de score/oportunidade.
 *
 * Não publica nada — apenas descobre e salva (spec §9 "separar descoberta de
 * publicação"). A publicação só acontece quando o link de afiliado é
 * cadastrado manualmente (lib/affiliate/attach-link.ts).
 */
export async function runProductDiscovery(): Promise<DiscoveryRunSummary> {
  const job = await prisma.job.create({
    data: { queue: "product-discovery", name: "Descoberta diária de produtos", status: "RUNNING", startedAt: new Date() },
  });

  const summary: DiscoveryRunSummary = {
    found: 0,
    createdNew: 0,
    promotions: 0,
    opportunitiesCreated: 0,
    ignored: 0,
    errors: 0,
    byPlatform: {},
  };

  try {
    const projects = await prisma.affiliateProject.findMany({ where: { active: true } });
    const projectBySlug = new Map(projects.map((p) => [p.slug, p]));
    const { minPrice, maxPrice } = await getPriceRules();

    const connectedClients: AffiliatePlatformClient[] = [];
    for (const client of CLIENTS) {
      try {
        await client.authenticate();
        connectedClients.push(client);
      } catch (error) {
        logger.warn("PRODUCT_SYNC", `Descoberta: ${client.platform} não conectado, pulando`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const tasks: DiscoveryTask[] = [];

    for (const bucket of DISCOVERY_BUCKETS) {
      const project = projectBySlug.get(bucket.projectSlug);
      if (!project) continue;
      for (const client of connectedClients) {
        if (bucket.platforms && !bucket.platforms.includes(client.platform)) continue;
        for (const query of bucket.keywords) {
          tasks.push({
            projectId: project.id,
            bucketLabel: bucket.label,
            client,
            query,
            categorySlug: bucket.categorySlug,
          });
        }
      }
    }

    // Varredura genérica de "promoções de qualquer tipo" (spec §2).
    // TikTok Shop → Achadinhos Tik Tok; demais plataformas classificam por título.
    for (const client of connectedClients) {
      const tiktokProjectId =
        client.platform === Platform.TIKTOK_SHOP
          ? (projectBySlug.get(ACHADINHOS_TIKTOK_PROJECT_SLUG)?.id ?? "")
          : "";
      for (const query of PROMOTION_SWEEP_TERMS) {
        tasks.push({
          projectId: tiktokProjectId,
          bucketLabel: "Promoções",
          client,
          query,
          categorySlug:
            client.platform === Platform.TIKTOK_SHOP ? "achadinhos-tiktok-ofertas-do-dia" : undefined,
        });
      }
    }

    for (const task of tasks) {
      try {
        const results = await task.client.searchProducts(task.query);
        summary.found += results.length;
        summary.byPlatform[task.client.platform] = (summary.byPlatform[task.client.platform] ?? 0) + results.length;

        for (const item of results) {
          await processDiscoveredProduct(item, task, projectBySlug, minPrice, maxPrice, summary);
        }
      } catch (error) {
        summary.errors += 1;
        logger.error("PRODUCT_SYNC", `Descoberta: falha ao buscar "${task.query}" em ${task.client.platform}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED", finishedAt: new Date(), result: summary as unknown as Prisma.InputJsonValue },
    });

    logger.info("JOB", "Descoberta diária concluída", summary);
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }

  return summary;
}

async function processDiscoveredProduct(
  item: NormalizedProduct,
  task: DiscoveryTask,
  projectBySlug: Map<string, { id: string; slug: string }>,
  minPrice: number,
  maxPrice: number,
  summary: DiscoveryRunSummary,
): Promise<void> {
  if (await isBlocked(item)) {
    summary.ignored += 1;
    return;
  }

  if (item.price < minPrice || item.price > maxPrice) {
    summary.ignored += 1;
    return;
  }

  const projectId =
    task.projectId || projectBySlug.get(classifyPromotionBucket(item.name, item.source))?.id;
  if (!projectId) {
    summary.ignored += 1;
    return;
  }

  const discountPercent = computeDiscountPercent(item.price, item.originalPrice);
  if (discountPercent && discountPercent >= 20) summary.promotions += 1;

  let categoryId: string | undefined;
  if (task.categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: task.categorySlug },
      select: { id: true, projectId: true },
    });
    if (category && category.projectId === projectId) {
      categoryId = category.id;
    }
  }

  const existing = await prisma.product.findUnique({
    where: { source_externalId: { source: item.source, externalId: item.externalId } },
    select: { id: true },
  });

  const slugBase = `${item.source.toLowerCase()}-${item.externalId}`;

  const product = await prisma.product.upsert({
    where: { source_externalId: { source: item.source, externalId: item.externalId } },
    create: {
      projectId,
      source: item.source,
      externalId: item.externalId,
      name: item.name,
      slug: slugBase,
      description: item.description,
      brand: item.brand,
      categoryId,
      imageUrl: item.imageUrl,
      productUrl: item.productUrl,
      price: item.price,
      originalPrice: item.originalPrice,
      discountPercent,
      rating: item.rating,
      reviewCount: item.reviewCount,
      soldCount: item.soldCount,
      commissionPercent: item.commissionPercent,
      commissionValue: item.commissionValue,
      currency: item.currency ?? "BRL",
    },
    update: {
      name: item.name,
      imageUrl: item.imageUrl,
      productUrl: item.productUrl,
      price: item.price,
      originalPrice: item.originalPrice,
      discountPercent,
      rating: item.rating,
      reviewCount: item.reviewCount,
      soldCount: item.soldCount,
      ...(categoryId ? { categoryId } : {}),
    },
  });

  await prisma.productSource.upsert({
    where: { platform_externalId: { platform: item.source, externalId: item.externalId } },
    create: {
      productId: product.id,
      platform: item.source,
      externalId: item.externalId,
      externalUrl: item.productUrl,
      storeName: item.storeName,
      rawData: item.raw as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
    update: {
      externalUrl: item.productUrl,
      storeName: item.storeName,
      rawData: item.raw as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
  });

  const { opportunitiesCreated } = await runScoringPipeline(product.id, { isNew: !existing });
  summary.opportunitiesCreated += opportunitiesCreated;
  if (!existing) summary.createdNew += 1;
}
