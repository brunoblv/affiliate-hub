import { mercadoLivreConnector } from "./mercado-livre";
import { shopeeConnector } from "./shopee";
import type { Connector } from "./types";

const CONNECTORS: Record<string, Connector> = {
  [shopeeConnector.key]: shopeeConnector,
  [mercadoLivreConnector.key]: mercadoLivreConnector,
};

export function getConnector(key: string | null | undefined): Connector | null {
  return key ? (CONNECTORS[key] ?? null) : null;
}

export function listConnectors(): Connector[] {
  return Object.values(CONNECTORS);
}

export type { Connector, FetchResult, OfferRef } from "./types";
