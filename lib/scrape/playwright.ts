import { chromium, type Browser } from "playwright";
import { logger } from "@/lib/logging";
import { extractProductFromHtml, type ScrapedProductData } from "./extract";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }
  return browserPromise;
}

/** Fecha o browser compartilhado (útil no shutdown do worker). */
export async function closeScrapeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}

/**
 * Abre a URL com Playwright e extrai dados do produto a partir do HTML renderizado.
 * Seletores específicos de loja são frágeis — a extração prioriza JSON-LD / Open Graph.
 */
export async function scrapeProductUrl(url: string): Promise<ScrapedProductData> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: "pt-BR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1365, height: 900 },
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await new Promise((resolve) => setTimeout(resolve, 2_500));


    const html = await page.content();
    const finalUrl = page.url();
    const data = extractProductFromHtml(html, finalUrl || url);

    logger.info("PRODUCT_SYNC", "Scrape Playwright concluído", {
      url,
      name: data.name,
      price: data.price,
      hasImage: Boolean(data.imageUrl),
    });

    return data;
  } finally {
    await context.close();
  }
}
