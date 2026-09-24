import assert from "node:assert/strict";
import { test } from "node:test";
import { observedCommercialContext } from "./commercial-context";

test("coleta sem condições não inventa Pix, parcelas ou frete grátis", () => {
  assert.deepEqual(observedCommercialContext(), {
    priceCondition: null, installments: null, installmentPriceCents: null,
    shippingKind: null, shippingCents: null,
  });
});

test("frete condicional não vira zero mesmo que a fonte envie um valor", () => {
  const context = observedCommercialContext({ shippingKind: "CONDITIONAL", shippingCents: 0 });
  assert.equal(context.shippingCents, null);
  assert.equal(context.shippingKind, "CONDITIONAL");
  assert.equal(observedCommercialContext({ shippingKind: "UNKNOWN", shippingCents: 500 }).shippingCents, null);
});

test("frete conhecido conserva o valor; apenas gratuidade explícita produz zero", () => {
  assert.equal(observedCommercialContext({ shippingKind: "FREE" }).shippingCents, 0);
  assert.equal(observedCommercialContext({ shippingKind: "PAID", shippingCents: 1290 }).shippingCents, 1290);
  for (const value of [0, -100, 12.5, NaN, Infinity]) {
    assert.equal(observedCommercialContext({ shippingKind: "PAID", shippingCents: value }).shippingCents, null);
  }
});

test("condições válidas são preservadas e números inválidos não entram no histórico", () => {
  assert.deepEqual(observedCommercialContext({
    priceCondition: " Pix ", installments: 10, installmentPriceCents: 12000,
  }), {
    priceCondition: "Pix", installments: 10, installmentPriceCents: 12000,
    shippingKind: null, shippingCents: null,
  });
  assert.equal(observedCommercialContext({ installments: 2.5 }).installments, null);
  assert.equal(observedCommercialContext({ installmentPriceCents: -100 }).installmentPriceCents, null);
});
