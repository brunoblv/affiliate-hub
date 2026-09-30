import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prisma } from "@/lib/db";
import { savePriceAlert } from "./save";
import { databaseAlertStore, evaluateAlerts, type AlertStore } from "./notify";
import { confirmedAlertContext } from "./context";
import type { Mail } from "@/lib/mail";

// Executar explicitamente apenas no banco local dedicado; SMTP sempre simulado.
test("PostgreSQL: contextos, migração de legado, concorrência e histórico de envio", {
  skip: process.env.RUN_ALERT_DB_TESTS !== "1",
}, async () => {
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.port, "5434");
  assert.equal(url.pathname, "/affiliate_hub");
  const id = `alert-test-${randomUUID()}`;
  const productId = `${id}-product`, userId = `${id}-user`, storeId = `${id}-store`;
  const variantId = `${id}-v1`, otherVariantId = `${id}-v2`;
  try {
    await prisma.user.create({ data: { id: userId, email: `${id}@example.invalid` } });
    await prisma.store.create({ data: { id: storeId, slug: id, name: "Teste local de alertas" } });
    await prisma.product.create({ data: { id: productId, slug: id, name: "Teste local de alertas", status: "PUBLISHED",
      variants: { create: [{ id: variantId, label: "110 V", isDefault: true }, { id: otherVariantId, label: "220 V" }] } } });
    for (const [suffix, variant, condition, payment, price] of [
      ["new", variantId, "NEW", "Pix", 1200],
      ["used", variantId, "USED", "Pix", 600],
      ["other", otherVariantId, "NEW", "Pix", 100],
      ["club", variantId, "NEW", "Clube", 200],
    ] as const) {
      await prisma.offer.create({ data: { id: `${id}-${suffix}`, variantId: variant, storeId, sellerName: "Teste",
        condition, priceCondition: payment, priceCents: price, priceCheckedAt: new Date(),
        availability: "IN_STOCK", method: "API", links: { create: {
          url: "https://example.invalid/affiliate-test", shortCode: `${id}-${suffix}`,
        } } } });
    }
    const input = { productId, alertId: "", targetCents: 900, variantId, itemCondition: "NEW",
      priceCondition: "pix", reactivate: false };
    await savePriceAlert(userId, input);
    await savePriceAlert(userId, { ...input, itemCondition: "USED", targetCents: 400 });
    await assert.rejects(savePriceAlert(userId, { ...input, priceCondition: "  PIX  " }), /já tem um alerta/);
    const legacy = await prisma.priceAlert.create({ data: { userId, productId, targetCents: 900 } });
    assert.equal(confirmedAlertContext(legacy), null);
    const sent: Mail[] = [];
    // Restringe leituras e recuperação às fixtures; claim/finish/rearm reais no PostgreSQL.
    const store: AlertStore = { ...databaseAlertStore, recover: async () => {},
      list: () => prisma.priceAlert.findMany({ where: { userId }, include: { user: { select: { email: true, name: true } } } }),
    };
    const run = () => evaluateAlerts({ store, mailer: { async send(mail) { sent.push(mail); } }, siteUrl: "https://example.invalid" });
    await run(); assert.equal(sent.length, 0, "outra variação/clube não dispara a meta");
    await prisma.offer.update({ where: { id: `${id}-new` }, data: { priceCents: 800 } });
    await prisma.offer.update({ where: { id: `${id}-used` }, data: { priceCents: 300 } });
    await Promise.all([run(), run()]);
    assert.equal(sent.length, 2, "um envio por contexto, mesmo com dois avaliadores");
    assert.ok(sent.some((mail) => mail.text.includes("condicao=NEW") && mail.text.includes("pagamento=pix")));
    assert.ok(sent.some((mail) => mail.text.includes("condicao=USED") && mail.text.includes("pagamento=pix")));
    const deliveries = await prisma.priceAlertDelivery.findMany({ where: { alert: { userId } } });
    assert.equal(deliveries.length, 2);
    assert.ok(deliveries.every((delivery) => delivery.status === "SENT"));
    await run(); assert.equal(sent.length, 2);
    const confirmed = await prisma.priceAlert.findFirstOrThrow({ where: { userId, itemCondition: "NEW" } });
    await assert.rejects(savePriceAlert("another-user", { ...input, alertId: confirmed.id, targetCents: 700 }), /não encontrado/);
    await savePriceAlert(userId, { ...input, alertId: legacy.id, variantId: otherVariantId, targetCents: 50 });
    const migrated = await prisma.priceAlert.findUniqueOrThrow({ where: { id: legacy.id } });
    assert.equal(confirmedAlertContext(migrated)?.variantId, otherVariantId);
    await prisma.productVariant.delete({ where: { id: otherVariantId } });
    const deletedVariant = await prisma.priceAlert.findUniqueOrThrow({ where: { id: legacy.id } });
    assert.equal(confirmedAlertContext(deletedVariant), null);
    await prisma.offer.update({ where: { id: `${id}-new` }, data: { priceCents: 1200 } });
    assert.equal((await run()).rearmed, 1);
    await prisma.offer.update({ where: { id: `${id}-new` }, data: { priceCents: 800 } });
    await run(); assert.equal(sent.length, 3);
  } finally {
    // IDs exclusivos criados acima: nunca limpa catálogo ou usuários preexistentes.
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.$disconnect();
  }
});
