import { observedDayKey, type Observation } from "./analysis";

export interface OfferObservation extends Observation {
  offerId: string;
  variantId: string | null;
  itemCondition: "NEW" | "USED" | null;
  priceCondition: string | null;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
}

export interface VariantHistoryContext {
  variantId: string;
  itemCondition: "NEW" | "USED";
  priceCondition: string | null;
}

export function normalizedPriceCondition(value: string | null): string | null {
  return value?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR") || null;
}

/** Lowest observed price on each São Paulo day, within one comparable commercial context. */
export function aggregateVariantHistory(
  observations: OfferObservation[],
  context: VariantHistoryContext,
): Observation[] {
  const expectedCondition = normalizedPriceCondition(context.priceCondition);
  const lowestByDay = new Map<string, Observation>();
  for (const point of observations) {
    if (point.variantId !== context.variantId || point.itemCondition !== context.itemCondition ||
      normalizedPriceCondition(point.priceCondition) !== expectedCondition ||
      point.availability === "OUT_OF_STOCK" || !Number.isFinite(point.t) ||
      !Number.isSafeInteger(point.cents) || point.cents <= 0) continue;
    const key = observedDayKey(point.t);
    const previous = lowestByDay.get(key);
    if (!previous || point.cents < previous.cents ||
      (point.cents === previous.cents && point.t > previous.t)) {
      lowestByDay.set(key, { t: point.t, cents: point.cents });
    }
  }
  return [...lowestByDay.values()].sort((a, b) => a.t - b.t);
}
