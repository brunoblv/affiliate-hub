/**
 * Regras de comparação (RF-03, RF-08). Funções puras: valem no servidor e no cliente.
 */
import { freshnessLimitMinutes } from "./format";
import type { Offer, PriceSummary, Store } from "./types";

/**
 * Uma oferta só disputa o "menor preço" quando não está sem estoque, não deu erro
 * e foi coletada recentemente o bastante para ainda merecer confiança.
 * Disponibilidade desconhecida não é "sem estoque": não exclui a oferta.
 */
export function isEligible(offer: Offer): boolean {
  return (
    offer.availability !== "sem_estoque" &&
    offer.status === "ativo" &&
    offer.collectedMinutesAgo <= freshnessLimitMinutes(offer.method)
  );
}

export function cheapestFirst(offers: Offer[]): Offer[] {
  return [...offers].sort((a, b) => a.priceCents - b.priceCents);
}

export function summarize(offers: Offer[]): PriceSummary {
  const sorted = cheapestFirst(offers);
  const eligible = sorted.filter(isEligible);
  const cheapest = eligible[0];
  return {
    lowestCents: cheapest?.priceCents ?? null,
    highestCents: eligible.length ? eligible[eligible.length - 1].priceCents : null,
    previousCents: cheapest?.previousPriceCents ?? null,
    installmentTimes: cheapest?.installments ?? null,
    installmentTotalCents: cheapest ? (cheapest.installmentPriceCents ?? cheapest.priceCents) : null,
    priceCondition: cheapest?.priceCondition ?? null,
    offerCount: offers.length,
    storeCount: new Set(offers.map((o) => o.storeId)).size,
    freshestMinutesAgo: eligible.length
      ? Math.min(...eligible.map((o) => o.collectedMinutesAgo))
      : null,
  };
}

/** Ofertas por loja: loja mais barata primeiro, e a mais barata dentro de cada loja. */
export function groupByStore(
  offers: Offer[],
  storeOf: (storeId: string) => Store,
): { store: Store; offers: Offer[] }[] {
  const grouped = new Map<string, Offer[]>();
  for (const offer of cheapestFirst(offers)) {
    const list = grouped.get(offer.storeId) ?? [];
    list.push(offer);
    grouped.set(offer.storeId, list);
  }
  return [...grouped.entries()]
    .map(([storeId, list]) => ({ store: storeOf(storeId), offers: list }))
    .sort((a, b) => a.offers[0].priceCents - b.offers[0].priceCents);
}
