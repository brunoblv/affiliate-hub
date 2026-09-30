import assert from "node:assert/strict";
import { test } from "node:test";
import { alertContextKey, alertLowest, alertProductPath, confirmedAlertContext } from "./context";
import { catalog, context, offer, alert } from "./test-fixtures";
import { selectComparison } from "@/lib/comparison";
import { buildAlertEmail } from "./email";

test("alerta não usa menor preço global, outra voltagem, usado ou clube", () => {
  const found = catalog([offer({ priceCents: 1200 }), offer({ id: "v2", variantId: "v2", priceCents: 100 }),
    offer({ id: "used", condition: "USED", priceCents: 200 }), offer({ id: "club", priceCondition: "Clube", priceCents: 300 })]);
  assert.equal(alertLowest(found, context), 1200);
  assert.equal(alertLowest(found, { ...context, variantId: "v2" }), 100);
});

test("sem oferta elegível ou contexto confirmado o alerta fica sem preço", () => {
  for (const changes of [{ availability: "sem_estoque" as const }, { status: "erro" as const }, { collectedMinutesAgo: 1500 }]) {
    assert.equal(alertLowest(catalog([offer(changes)]), context), null);
  }
  assert.equal(alertLowest(undefined, context), null);
  assert.equal(alertLowest(catalog(), null), null);
  assert.equal(alertLowest(catalog(), { ...context, variantId: "deleted" }), null);
  assert.equal(confirmedAlertContext(alert({ contextKey: null, variantId: null, itemCondition: null })), null);
  assert.equal(confirmedAlertContext(alert({ variantId: "different" })), null);
});

test("pagamento desconhecido não é coringa; caixa e espaços equivalentes não duplicam alertas", () => {
  const found = catalog([offer({ priceCents: 100 }), offer({ id: "unknown", priceCondition: null, priceCents: 900 })]);
  assert.equal(alertLowest(found, { ...context, priceCondition: null }), 900);
  assert.equal(alertContextKey({ ...context, priceCondition: "  PIX  " }), alertContextKey(context));
  assert.notEqual(alertContextKey(context), alertContextKey({ ...context, priceCondition: null }));
});

test("link de alerta preserva contexto de pagamento na página, inclusive desconhecido", () => {
  const found = catalog([offer({ priceCents: 100 }), offer({ id: "unknown", priceCondition: null, priceCents: 900 })]);
  for (const payment of ["pix", null]) {
    const url = new URL(alertProductPath("produto", { ...context, priceCondition: payment }), "https://example.com");
    const selected = selectComparison(found.product.variants, found.offers,
      url.searchParams.get("variacao")!, url.searchParams.get("condicao")!, url.searchParams.get("pagamento")!);
    assert.equal(selected.best?.priceCents, payment ? 100 : 900);
  }
});

test("e-mail identifica a opção, escapa HTML e aponta à comparação selecionada", () => {
  const mail = buildAlertEmail({ to: "test@example.invalid", userName: "Ana", productName: "Produto <script>",
    contextLabel: "110 V · Novo · Pix <script>", priceCents: 800, targetCents: 900,
    productUrl: `https://example.com${alertProductPath("produto", context)}`, contaUrl: "https://example.com/conta#alertas" });
  assert.match(mail.text, /110 V · Novo · Pix/);
  assert.match(mail.text, /pagamento=pix/);
  assert.match(mail.text, /sem frete/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
});
