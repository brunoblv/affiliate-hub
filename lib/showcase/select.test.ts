import assert from "node:assert/strict";
import { test } from "node:test";
import { pickEntries, stillValid } from "./select";
import type { ShowcaseItem } from "./types";

const now = new Date("2026-10-12T12:00:00Z");
const item = (id: string, patch: Partial<ShowcaseItem> = {}): ShowcaseItem => ({
  productId: `p-${id}`, offerId: `o-${id}`, variantId: "v", storeId: "s",
  priceCents: 10_000, priceObservedAt: now, declaredPreviousCents: null,
  atMinimum: false, assessment: "normal", differenceFromAveragePct: null, drop7dPct: null,
  salesCount: null, ratingCentis: null, metricsCheckedAt: null, offerCreatedAt: new Date("2026-08-01T00:00:00Z"),
  ...patch,
});
const context = { storeName: "Shopee", now };

test("achados: menor preço vem antes de abaixo da média, que vem antes de queda", () => {
  const entries = pickEntries("ACHADOS", [
    item("queda", { drop7dPct: 25 }),
    item("media", { differenceFromAveragePct: -18 }),
    item("minimo", { atMinimum: true }),
  ], context);
  assert.deepEqual(entries.map((entry) => entry.item.productId), ["p-minimo", "p-media", "p-queda"]);
  assert.equal(entries[1].reason, "18% abaixo da média de 30 dias");
});

test("achados: menos de 15% abaixo da média não entra", () => {
  assert.equal(pickEntries("ACHADOS", [item("a", { differenceFromAveragePct: -12 })], context).length, 0);
});

test("achados: critério de nota/vendas exige desconto declarado, nota alta, vendas e métrica recente", () => {
  const strong = item("ok", {
    declaredPreviousCents: 14_000, ratingCentis: 470, salesCount: 2_300, metricsCheckedAt: new Date("2026-10-09T00:00:00Z"),
  });
  assert.equal(pickEntries("ACHADOS", [strong], context).length, 1);
  assert.equal(pickEntries("ACHADOS", [{ ...strong, metricsCheckedAt: new Date("2026-08-01T00:00:00Z") }], context).length, 0);
  assert.equal(pickEntries("ACHADOS", [{ ...strong, declaredPreviousCents: null }], context).length, 0);
});

test("mais vendidos: ignora métrica velha e ordena por vendas, citando fonte e data", () => {
  const entries = pickEntries("MAIS_VENDIDOS", [
    item("a", { salesCount: 100, metricsCheckedAt: new Date("2026-10-09T15:00:00Z") }),
    item("b", { salesCount: 2_300, metricsCheckedAt: new Date("2026-10-09T15:00:00Z") }),
    item("velho", { salesCount: 99_999, metricsCheckedAt: new Date("2026-06-01T00:00:00Z") }),
    item("sem"),
  ], context);
  assert.deepEqual(entries.map((entry) => entry.item.productId), ["p-b", "p-a"]);
  assert.match(entries[0].reason, /segundo a Shopee, em 09\/10/);
});

test("novidades: só últimos 7 dias, mais novas primeiro", () => {
  const entries = pickEntries("NOVIDADES", [
    item("velha"),
    item("nova", { offerCreatedAt: new Date("2026-10-11T00:00:00Z") }),
    item("media", { offerCreatedAt: new Date("2026-10-08T00:00:00Z") }),
  ], context);
  assert.deepEqual(entries.map((entry) => entry.item.productId), ["p-nova", "p-media"]);
});

test("melhores ofertas: limita a 12", () => {
  const items = Array.from({ length: 20 }, (_, i) => item(String(i), { atMinimum: true }));
  assert.equal(pickEntries("MELHORES_OFERTAS", items, context).length, 12);
});

test("reconferência: sai oferta que sumiu ou cujo preço subiu", () => {
  const live = new Map([["o1", { priceCents: 9_000 }], ["o2", { priceCents: 11_000 }]]);
  assert.equal(stillValid({ offerId: "o1", priceCents: 10_000 }, live), true);
  assert.equal(stillValid({ offerId: "o2", priceCents: 10_000 }, live), false);
  assert.equal(stillValid({ offerId: "o3", priceCents: 10_000 }, live), false);
});
