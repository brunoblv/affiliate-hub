import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeDeal } from "./deals";
import { aggregateVariantHistory, type OfferObservation } from "./variant";

const DAY = 86400000;
const now = Date.parse("2026-09-28T15:00:00Z");
const context = { variantId: "v", itemCondition: "NEW" as const, priceCondition: null };
const observation = (day: number, cents: number, extra: Partial<OfferObservation> = {}): OfferObservation => ({
  ...context, offerId: "a", availability: "IN_STOCK", t: now - day * DAY, cents, ...extra,
});
const history = Array.from({ length: 9 }, (_, i) => observation(8 - i, i === 8 ? 800 : 1000));

test("troca da loja mais barata mantém a queda da série comparável", () => {
  const points = aggregateVariantHistory([...history,
    observation(0, 700, { offerId: "b" }),
    observation(0, 100, { itemCondition: "USED" }),
    observation(0, 200, { priceCondition: "Pix" }),
    observation(0, 300, { variantId: "other" }),
  ], context);
  const result = analyzeDeal(points, 700, now, DAY);
  assert.equal(result.dropFrom, 1000);
  assert.equal(result.atMinimum, true);
  assert.equal(result.analysis.assessment, "low");
  assert.equal(result.analysis.observedDays, 9);
});

test("várias coletas no mesmo dia não sustentam classificação", () => {
  const points = Array.from({ length: 20 }, (_, i) => ({ t: now - i * 1000, cents: 1000 + i }));
  const result = analyzeDeal(points, 500, now, DAY);
  assert.equal(result.dropFrom, null);
  assert.equal(result.atMinimum, false);
  assert.equal(result.analysis.assessment, "insufficient");
});

test("histórico vencido, futuro ou fora de 30 dias não produz promoção", () => {
  for (const offset of [-2 * DAY, -40 * DAY, 40 * DAY]) {
    const points = history.map((point) => ({ ...point, t: point.t + offset }));
    const result = analyzeDeal(points, 500, now, DAY);
    assert.equal(result.dropFrom, null);
    assert.equal(result.atMinimum, false);
  }
});

test("preço constante não vira queda ou menor preço promocional", () => {
  const result = analyzeDeal(history.map((point) => ({ ...point, cents: 1000 })), 1000, now, DAY);
  assert.equal(result.dropFrom, null);
  assert.equal(result.atMinimum, false);
  assert.equal(result.analysis.assessment, "normal");
});

test("nova mínima atual é aceita sem inventar ponto no histórico", () => {
  const points = history.map((point) => ({ ...point, cents: 1000 }));
  const result = analyzeDeal(points, 700, now, DAY);
  assert.equal(result.atMinimum, true);
  assert.equal(result.analysis.observations.length, points.length);
  assert.equal(result.analysis.lowest, 1000);
});
