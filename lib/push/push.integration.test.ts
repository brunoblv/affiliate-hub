import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createECDH, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { alertContextKey } from "@/lib/alerts/context";
import { evaluatePushAlerts, type PushDeps } from "./notify";

test("PostgreSQL push: concorrência, contexto, rearme independente, timeout, retry e revogação", {
  skip: process.env.RUN_ALERT_DB_TESTS !== "1",
}, async () => {
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.port, "5434"); assert.equal(url.pathname, "/affiliate_hub");
  const id = `push-test-${randomUUID()}`;
  const pair = createECDH("prime256v1"); pair.generateKeys();
  const context = { variantId: `${id}-v`, itemCondition: "NEW" as const, priceCondition: "pix" };
  let sent = 0;
  let clock = new Date();
  let send: NonNullable<PushDeps["send"]> = async (_subscription, payload) => {
    const data = JSON.parse(payload);
    assert.ok(data.url.includes("condicao=NEW") && data.url.includes("pagamento=pix"));
    assert.ok(!data.url.includes("example.invalid"));
    sent++;
  };
  const run = () => evaluatePushAlerts({
    list: () => prisma.priceAlert.findMany({ where: { userId: id }, include: { user: { select: { pushSubscriptions: true } } } }),
    now: () => clock, send: (subscription, payload) => send(subscription, payload),
  });
  try {
    await prisma.user.create({ data: { id, email: `${id}@example.invalid` } });
    await prisma.store.create({ data: { id, slug: id, name: "Push fixture" } });
    await prisma.product.create({ data: { id, slug: id, name: "Push fixture", status: "PUBLISHED",
      variants: { create: { id: context.variantId, label: "110 V" } } } });
    await prisma.offer.create({ data: { id, variantId: context.variantId, storeId: id, sellerName: "Fixture", condition: "NEW",
      priceCondition: "Pix", priceCents: 1200, priceCheckedAt: clock, availability: "IN_STOCK", method: "API",
      links: { create: { url: "https://example.invalid/affiliate-test", shortCode: id } } } });
    await prisma.priceAlert.create({ data: { id, userId: id, productId: id, targetCents: 900, ...context, contextKey: alertContextKey(context) } });
    await prisma.pushSubscription.create({ data: { id, userId: id, endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
      p256dh: pair.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } });
    await run(); assert.equal(sent, 0);
    await prisma.offer.update({ where: { id }, data: { priceCents: 800 } });
    await Promise.all([run(), run()]); assert.equal(sent, 1);
    await run(); assert.equal(sent, 1);
    // Rearme de e-mail não duplica push com preço ainda na meta.
    await prisma.priceAlert.update({ where: { id }, data: { revision: { increment: 1 } } });
    await run(); assert.equal(sent, 1);
    await prisma.offer.update({ where: { id }, data: { priceCents: 1200 } });
    assert.equal((await run()).rearmed, 1);
    await prisma.offer.update({ where: { id }, data: { priceCents: 800 } });
    send = async () => { throw new Error("timeout"); };
    await run();
    assert.equal((await prisma.pushDelivery.findFirstOrThrow({ where: { alertId: id } })).status, "UNCERTAIN");
    let attempts = 0;
    send = async () => { attempts++; throw { statusCode: 429 }; };
    await run(); assert.equal(attempts, 0, "resultado incerto não deve ser reenviado");
    // Nova passagem de preço permite uma nova notificação.
    await prisma.offer.update({ where: { id }, data: { priceCents: 1200 } }); await run();
    await prisma.offer.update({ where: { id }, data: { priceCents: 800 } }); await run();
    assert.equal(attempts, 1); await run(); assert.equal(attempts, 1);
    clock = new Date(clock.getTime() + 16 * 60_000); await run(); assert.equal(attempts, 2);
    clock = new Date(clock.getTime() + 31 * 60_000);
    send = async () => { throw { statusCode: 410 }; };
    await run();
    assert.equal(await prisma.pushSubscription.count({ where: { id } }), 0);
    assert.equal(await prisma.pushDelivery.count({ where: { alertId: id } }), 0);
    assert.equal((await prisma.priceAlert.findUniqueOrThrow({ where: { id } })).deliveryStatus, "IDLE", "push não altera SMTP");
  } finally {
    await prisma.user.deleteMany({ where: { id } });
    await prisma.product.deleteMany({ where: { id } });
    await prisma.store.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
});
