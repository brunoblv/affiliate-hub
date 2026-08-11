import path from "path";
import { chromium, type BrowserContext } from "playwright";
import { logger } from "@/lib/logging";
import { extractProductFromHtml, type ScrapedProductData } from "./extract";
import { isSecurityChallengePage, ScrapeSecurityChallengeError } from "./security";

const PROFILE_DIR = path.join(process.cwd(), ".playwright", "scrape-profile");

let contextPromise: Promise<BrowserContext> | null = null;

function headedEnabled(): boolean {
  const value = (process.env.SCRAPE_HEADED ?? "").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function challengeWaitMs(): number {
  const raw = Number(process.env.SCRAPE_CHALLENGE_WAIT_MS ?? 120_000);
  return Number.isFinite(raw) && raw >= 0 ? raw : 120_000;
}

async function getContext(): Promise<BrowserContext> {
  if (!contextPromise) {
    const headed = headedEnabled();
    contextPromise = chromium.launchPersistentContext(PROFILE_DIR, {
      headless: !headed,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1365, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-default-browser-check",
        "--disable-infobars",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    }).then(async (context) => {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });
      return context;
    });
  }
  return contextPromise;
}

/** Fecha o contexto persistente (útil no shutdown do worker). */
export async function closeScrapeBrowser(): Promise<void> {
  if (!contextPromise) return;
  const context = await contextPromise;
  contextPromise = null;
  await context.close();
}

async function assertNotBlocked(pageUrl: string, title: string, html: string): Promise<void> {
  if (isSecurityChallengePage({ title, html, url: pageUrl })) {
    throw new ScrapeSecurityChallengeError(pageUrl);
  }
}

/**
 * Abre a URL com Playwright (perfil persistente) e extrai dados do produto.
 * Se aparecer Security Check e SCRAPE_HEADED=1, espera você resolver no browser.
 */
export async function scrapeProductUrl(url: string): Promise<ScrapedProductData> {
  const context = await getContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    // Scroll leve — parece navegação humana e dispara lazy-load.
    await page.mouse.wheel(0, 1200);
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    let html = await page.content();
    let title = await page.title();
    let finalUrl = page.url();

    if (isSecurityChallengePage({ title, html, url: finalUrl })) {
      if (headedEnabled() && challengeWaitMs() > 0) {
        logger.warn("PRODUCT_SYNC", "Security Check detectado — resolva no navegador aberto", {
          url,
          waitMs: challengeWaitMs(),
        });
        const deadline = Date.now() + challengeWaitMs();
        while (Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 3_000));
          html = await page.content();
          title = await page.title();
          finalUrl = page.url();
          if (!isSecurityChallengePage({ title, html, url: finalUrl })) break;
        }
      }

      await assertNotBlocked(finalUrl || url, title, html);
    }

    // Aguarda um pouco mais se ainda não há sinal de produto.
    if (!html.includes("application/ld+json") && !/og:title/i.test(html)) {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      html = await page.content();
      title = await page.title();
      finalUrl = page.url();
      await assertNotBlocked(finalUrl || url, title, html);
    }

    const data = extractProductFromHtml(html, finalUrl || url);

    if (isSecurityChallengePage({ title: data.name, html, url: finalUrl })) {
      throw new ScrapeSecurityChallengeError(finalUrl || url);
    }

    logger.info("PRODUCT_SYNC", "Scrape Playwright concluído", {
      url,
      finalUrl,
      name: data.name,
      price: data.price,
      hasImage: Boolean(data.imageUrl),
    });

    return data;
  } finally {
    await page.close();
  }
}
