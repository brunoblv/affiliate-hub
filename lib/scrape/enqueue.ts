import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { getQueue } from "@/workers/queues";
import { parseUrlsFromText } from "./url";

const DEFAULT_DELAY_MINUTES = 3;

export async function getScrapeDelayMinutes(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: "scrapeRules" } });
  const value = (setting?.value as { delayMinutes?: number } | undefined) ?? {};
  const minutes = value.delayMinutes ?? DEFAULT_DELAY_MINUTES;
  return Math.max(1, minutes);
}

export interface EnqueueUrlScrapesResult {
  queued: number;
  urls: string[];
  delayMinutes: number;
  jobIds: string[];
}

/**
 * Enfileira URLs para scrape Playwright com atraso crescente entre cada uma
 * (evita rajada no mesmo IP). Requer `npm run workers` + REDIS_URL.
 */
export async function enqueueUrlScrapes(params: {
  projectId: string;
  projectSlug: string;
  text: string;
  categoryId?: string;
  delayMinutes?: number;
}): Promise<EnqueueUrlScrapesResult> {
  const urls = parseUrlsFromText(params.text);
  if (urls.length === 0) {
    throw new Error("Nenhuma URL válida encontrada. Cole um link por linha (http/https).");
  }

  const delayMinutes = params.delayMinutes ?? (await getScrapeDelayMinutes());
  const delayMs = delayMinutes * 60_000;
  const queue = getQueue("url-scrape");
  const jobIds: string[] = [];

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i]!;
    const delay = i * delayMs;

    const dbJob = await prisma.job.create({
      data: {
        queue: "url-scrape",
        name: `Scrape ${new URL(url).hostname}`,
        status: "PENDING",
        scheduledAt: new Date(Date.now() + delay),
        payload: {
          projectId: params.projectId,
          projectSlug: params.projectSlug,
          url,
          categoryId: params.categoryId ?? null,
        },
      },
    });

    await queue.add(
      "scrape-product-url",
      {
        dbJobId: dbJob.id,
        projectId: params.projectId,
        url,
        categoryId: params.categoryId,
      },
      {
        jobId: dbJob.id,
        delay,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: "fixed", delay: delayMs },
      },
    );

    jobIds.push(dbJob.id);
  }

  logger.info("PRODUCT_SYNC", "URLs enfileiradas para scrape Playwright", {
    projectId: params.projectId,
    queued: urls.length,
    delayMinutes,
  });

  return { queued: urls.length, urls, delayMinutes, jobIds };
}
