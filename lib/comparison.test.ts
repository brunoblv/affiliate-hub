import assert from "node:assert/strict";
import { test } from "node:test";
import { productHref, selectComparison } from "./comparison";
import { summarize } from "./pricing";
import type { Offer, Product } from "./types";

const variants = [{ id: "v1", label: "110 V", attributes: {} }, { id: "v2", label: "220 V", attributes: {} }];
const offer = (id: string, condition: Offer["condition"], priceCents: number, extra: Partial<Offer> = {}): Offer => ({
  id, condition, priceCents, productId: "p", variantId: "v1", storeId: id, seller: id,
  installments: null, installmentPriceCents: null, priceCondition: null,
  shipping: { kind: "desconhecido", label: "Frete não informado" }, availability: "em_estoque",
  method: "API", status: "ativo", collectedMinutesAgo: 1, shortCode: id, ...extra,
});

test("novo e usado não disputam preço, diferença ou contagem da mesma comparação", () => {
  const offers = [offer("used", "USED", 500), offer("new1", "NEW", 1000), offer("new2", "NEW", 1500),
    offer("other", "NEW", 100, { variantId: "v2" })];
  const selected = selectComparison(variants, offers, "v1", "NEW");
  assert.equal(selected.best?.id, "new1");
  const summary = summarize(selected.offers);
  assert.equal(summary.lowestCents, 1000);
  assert.equal(summary.highestCents, 1500);
  assert.equal(summary.storeCount, 2);
  assert.equal(selectComparison(variants, offers, "v1", "USED").best?.id, "used");
});

test("seleção explícita indisponível não volta silenciosamente para outra condição", () => {
  const selected = selectComparison(variants, [offer("new", "NEW", 1000)], "v1", "USED");
  assert.equal(selected.best, null);
  assert.deepEqual(selected.offers, []);
});

test("padrão escolhe variação elegível e ignora usado vencido mais barato", () => {
  const selected = selectComparison(variants, [
    offer("stale", "USED", 100, { collectedMinutesAgo: 60 * 25 }),
    offer("current", "NEW", 1000, { variantId: "v2" }),
  ]);
  assert.equal(selected.variant?.id, "v2");
  assert.equal(selected.condition, "NEW");
  assert.equal(selected.best?.id, "current");
});

test("link do recorte preserva variação e condição", () => {
  const product = { slug: "item", deal: { variantId: "v 1", condition: "USED" } } as Product;
  const url = new URL(productHref(product), "https://example.com");
  assert.equal(url.pathname, "/produto/item");
  assert.equal(url.searchParams.get("variacao"), "v 1");
  assert.equal(url.searchParams.get("condicao"), "USED");
});
