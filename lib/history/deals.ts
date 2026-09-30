import { analyzePriceHistory, type Observation } from "./analysis";

/** Mesmo período inicial, cobertura e análise da página do produto. */
export function analyzeDeal(points: Observation[], currentCents: number, now: number, maxAgeMs: number) {
  const analysis = analyzePriceHistory({ points, currentCents, now,
    from: now - 30 * 24 * 60 * 60 * 1000, maxAgeMs });
  const sufficient = analysis.assessment !== "insufficient";
  const first = analysis.observations[0]?.cents ?? null;
  return {
    analysis,
    dropFrom: sufficient && first !== null && first > currentCents ? first : null,
    atMinimum: sufficient && analysis.lowest !== null && currentCents <= analysis.lowest
      && analysis.highest !== null && analysis.highest > currentCents,
  };
}
