import { prisma } from "@/lib/database";
import { type Prisma } from "@/lib/generated/prisma/client";
import { runScoringPipeline } from "@/lib/scoring";
import { scrapeProductUrl } from "./playwright";
import { isScrapedProductIncomplete } from "./extract";
import { detectPlatformFromUrl, extractExternalId } from "./url";

export interface ScrapeAndSaveResult {
  productId: string;
  created: boolean;
  incomplete: boolean;
  name: string;
  price: number;
}

function discountPercent(price: number, originalPrice?: number): number | undefined {
  if (!originalPrice || originalPrice <= price) return undefined;
  return Math.round(((originalPrice - price) / originalPrice) * 100 * 100) / 100;
}

/** Faz scrape da URL e faz upsert em Product + ProductSource no projeto informado. */
export async function scrapeUrlAndSaveProduct(params: {
  projectId: string;
  url: string;
  categoryId?: string;
}): Promise<ScrapeAndSaveResult> {
  const platform = detectPlatformFromUrl(params.url);
  const externalId = extractExternalId(params.url, platform);
  const scraped = await scrapeProductUrl(params.url);

  const existing = await prisma.product.findUnique({
    where: { source_externalId: { source: platform, externalId } },
    select: { id: true },
  });

  const discount = discountPercent(scraped.price, scraped.originalPrice);
  const slugBase = `${platform.toLowerCase()}-${externalId}`;

  const product = await prisma.product.upsert({
    where: { source_externalId: { source: platform, externalId } },
    create: {
      projectId: params.projectId,
      source: platform,
      externalId,
      name: scraped.name,
      slug: slugBase,
      description: scraped.description,
      categoryId: params.categoryId,
      imageUrl: scraped.imageUrl,
      productUrl: params.url,
      price: scraped.price,
      originalPrice: scraped.originalPrice,
      discountPercent: discount,
      currency: scraped.currency || "BRL",
      status: "INACTIVE",
    },
    update: {
      name: scraped.name,
      description: scraped.description,
      imageUrl: scraped.imageUrl,
      productUrl: params.url,
      price: scraped.price,
      originalPrice: scraped.originalPrice,
      discountPercent: discount,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    },
  });

  await prisma.productSource.upsert({
    where: { platform_externalId: { platform, externalId } },
    create: {
      productId: product.id,
      platform,
      externalId,
      externalUrl: params.url,
      rawData: scraped.raw as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
    update: {
      productId: product.id,
      externalUrl: params.url,
      rawData: scraped.raw as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
  });

  if (scraped.price > 0) {
    await prisma.productPriceHistory.create({
      data: { productId: product.id, price: scraped.price },
    });
  }

  await runScoringPipeline(product.id, { isNew: !existing });

  const incomplete = isScrapedProductIncomplete({
    name: product.name,
    price: Number(product.price),
    imageUrl: product.imageUrl,
    description: product.description,
    categoryId: product.categoryId,
  });

  return {
    productId: product.id,
    created: !existing,
    incomplete: incomplete || product.status === "INACTIVE",
    name: product.name,
    price: Number(product.price),
  };
}

export type { Platform } from "@/lib/generated/prisma/client";
