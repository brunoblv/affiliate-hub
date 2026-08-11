import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import type { Prisma } from "@/lib/generated/prisma/client";
import { detectPlatformFromUrl, extractExternalId, parseUrlsFromText } from "./url";

export interface ImportDraftUrlsResult {
  created: number;
  updated: number;
  urls: string[];
  productIds: string[];
}

/**
 * Cria rascunhos INACTIVE só com a URL (sem Playwright).
 * Útil quando a loja bloqueia scrape automático (ex.: TikTok Security Check).
 */
export async function importDraftUrls(params: {
  projectId: string;
  text: string;
  categoryId?: string;
}): Promise<ImportDraftUrlsResult> {
  const urls = parseUrlsFromText(params.text);
  if (urls.length === 0) {
    throw new Error("Nenhuma URL válida encontrada. Cole um link por linha (http/https).");
  }

  let created = 0;
  let updated = 0;
  const productIds: string[] = [];

  for (const url of urls) {
    const platform = detectPlatformFromUrl(url);
    const externalId = extractExternalId(url, platform);
    const host = new URL(url).hostname.replace(/^www\./, "");
    const name = `Rascunho · ${host} · ${externalId.slice(0, 10)}`;

    const existing = await prisma.product.findUnique({
      where: { source_externalId: { source: platform, externalId } },
      select: { id: true },
    });

    const product = await prisma.product.upsert({
      where: { source_externalId: { source: platform, externalId } },
      create: {
        projectId: params.projectId,
        source: platform,
        externalId,
        name,
        slug: `${platform.toLowerCase()}-${externalId}`,
        categoryId: params.categoryId,
        productUrl: url,
        price: 0,
        currency: "BRL",
        status: "INACTIVE",
      },
      update: {
        productUrl: url,
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        status: "INACTIVE",
      },
    });

    await prisma.productSource.upsert({
      where: { platform_externalId: { platform, externalId } },
      create: {
        productId: product.id,
        platform,
        externalId,
        externalUrl: url,
        rawData: { importMode: "draft-url", importedAt: new Date().toISOString() } as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
      },
      update: {
        productId: product.id,
        externalUrl: url,
        lastSyncedAt: new Date(),
      },
    });

    productIds.push(product.id);
    if (existing) updated += 1;
    else created += 1;
  }

  logger.info("PRODUCT_SYNC", "URLs importadas como rascunho (sem scrape)", {
    projectId: params.projectId,
    created,
    updated,
  });

  return { created, updated, urls, productIds };
}

/** Upsert a partir de captura manual (bookmarklet / formulário). */
export async function upsertCapturedProduct(params: {
  projectId: string;
  url: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  description?: string;
  categoryId?: string;
  affiliateUrl?: string;
  activate?: boolean;
}) {
  const platform = detectPlatformFromUrl(params.url);
  const externalId = extractExternalId(params.url, platform);
  const discount =
    params.originalPrice && params.originalPrice > params.price
      ? Math.round(((params.originalPrice - params.price) / params.originalPrice) * 100 * 100) / 100
      : undefined;

  const product = await prisma.product.upsert({
    where: { source_externalId: { source: platform, externalId } },
    create: {
      projectId: params.projectId,
      source: platform,
      externalId,
      name: params.name.slice(0, 500),
      slug: `${platform.toLowerCase()}-${externalId}`,
      description: params.description,
      categoryId: params.categoryId,
      imageUrl: params.imageUrl,
      productUrl: params.url,
      price: params.price,
      originalPrice: params.originalPrice,
      discountPercent: discount,
      currency: "BRL",
      status: params.activate ? "ACTIVE" : "INACTIVE",
    },
    update: {
      name: params.name.slice(0, 500),
      description: params.description,
      imageUrl: params.imageUrl,
      productUrl: params.url,
      price: params.price,
      originalPrice: params.originalPrice,
      discountPercent: discount,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.activate ? { status: "ACTIVE" as const } : {}),
    },
  });

  await prisma.productSource.upsert({
    where: { platform_externalId: { platform, externalId } },
    create: {
      productId: product.id,
      platform,
      externalId,
      externalUrl: params.url,
      affiliateUrl: params.affiliateUrl,
      rawData: {
        importMode: "manual-capture",
        capturedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
    update: {
      productId: product.id,
      externalUrl: params.url,
      ...(params.affiliateUrl ? { affiliateUrl: params.affiliateUrl } : {}),
      lastSyncedAt: new Date(),
    },
  });

  if (params.price > 0) {
    await prisma.productPriceHistory.create({
      data: { productId: product.id, price: params.price },
    });
  }

  return product;
}
