import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateVariantHistory, type OfferObservation } from "./variant";

const at = (date: string, cents: number, overrides: Partial<OfferObservation> = {}): OfferObservation => ({
  t: Date.parse(date), cents, offerId: "offer-1", variantId: "variant-1", itemCondition: "NEW",
  priceCondition: null, availability: "IN_STOCK", ...overrides,
});
const context = { variantId: "variant-1", itemCondition: "NEW" as const, priceCondition: null };

test("escolhe o menor preço observado no dia entre vendedores comparáveis", () => {
  const points = aggregateVariantHistory([
    at("2026-09-01T12:00:00Z", 12000),
    at("2026-09-01T15:00:00Z", 10000, { offerId: "offer-2" }),
    at("2026-09-02T13:00:00Z", 11000),
  ], context);
  assert.deepEqual(points, [
    { t: Date.parse("2026-09-01T15:00:00Z"), cents: 10000 },
    { t: Date.parse("2026-09-02T13:00:00Z"), cents: 11000 },
  ]);
});

test("não mistura Pix, usado, outra variação ou anúncio sem estoque", () => {
  const points = aggregateVariantHistory([
    at("2026-09-01T12:00:00Z", 10000),
    at("2026-09-01T13:00:00Z", 8000, { priceCondition: "PIX" }),
    at("2026-09-01T14:00:00Z", 7000, { itemCondition: "USED" }),
    at("2026-09-01T15:00:00Z", 6000, { variantId: "variant-2" }),
    at("2026-09-01T16:00:00Z", 5000, { availability: "OUT_OF_STOCK" }),
    at("2026-09-01T17:00:00Z", 4000, { itemCondition: null }),
    at("2026-09-01T18:00:00Z", 3000, { variantId: null }),
  ], context);
  assert.deepEqual(points, [{ t: Date.parse("2026-09-01T12:00:00Z"), cents: 10000 }]);
});

test("condições equivalentes por caixa e espaços ficam juntas, sem absorver preço geral", () => {
  const points = aggregateVariantHistory([
    at("2026-09-01T12:00:00Z", 10000, { priceCondition: " Pix  " }),
    at("2026-09-01T13:00:00Z", 9000, { priceCondition: "PIX" }),
    at("2026-09-01T14:00:00Z", 8000),
  ], { ...context, priceCondition: "pix" });
  assert.deepEqual(points, [{ t: Date.parse("2026-09-01T13:00:00Z"), cents: 9000 }]);
});

test("o dia é calculado no fuso de São Paulo", () => {
  const points = aggregateVariantHistory([
    at("2026-09-02T01:00:00Z", 10000),
    at("2026-09-02T04:00:00Z", 9000),
  ], context);
  assert.equal(points.length, 2);
});
