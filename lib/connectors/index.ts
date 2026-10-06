import { aliExpressConnector } from "./aliexpress";
import { mercadoLivreConnector } from "./mercado-livre";
import { shopeeConnector } from "./shopee";
import type { Connector } from "./types";

const CONNECTORS: Record<string, Connector> = {
  [shopeeConnector.key]: shopeeConnector,
  [mercadoLivreConnector.key]: mercadoLivreConnector,
  [aliExpressConnector.key]: aliExpressConnector,
};

export function getConnector(key: string | null | undefined): Connector | null {
  return key ? (CONNECTORS[key] ?? null) : null;
}

/** Expande link curto de afiliado de qualquer loja conhecida; devolve a própria URL se não for curto. */
export async function expandShortUrl(url: string): Promise<{ url: string; shortUrl: string | null }> {
  for (const connector of Object.values(CONNECTORS)) {
    const full = await connector.resolveShortUrl?.(url).catch(() => null);
    if (full) return { url: full, shortUrl: url };
  }
  return { url, shortUrl: null };
}

export function listConnectors(): Connector[] {
  return Object.values(CONNECTORS);
}

export type { Connector, FetchResult, OfferRef } from "./types";
