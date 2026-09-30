import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "@/lib/db";
import { savePriceAlert, type SaveAlertInput } from "./save";
import { alert, catalog, offer } from "./test-fixtures";
import { alertContextKey } from "./context";

const input: SaveAlertInput = { productId: "p1", alertId: "", targetCents: 700,
  variantId: "v1", itemCondition: "NEW", priceCondition: " PIX ", reactivate: false };

function fixture(previous: ReturnType<typeof alert> | null = null, found = catalog()) {
  const writes: Record<string, unknown>[] = [];
  const operations = {
    async create(args: { data: Record<string, unknown> }) { writes.push(args.data); return {}; },
    async updateMany(args: { data: Record<string, unknown> }) { writes.push(args.data); return { count: 1 }; },
  };
  const db = {
    priceAlert: { async findFirst(args: { where: { id: string; userId: string; productId: string } }) {
      return previous && previous.id === args.where.id && previous.userId === args.where.userId
        && previous.productId === args.where.productId ? previous : null;
    } },
    async $transaction(fn: (tx: { priceAlert: typeof operations }) => unknown) { return fn({ priceAlert: operations }); },
  } as unknown as typeof prisma;
  return { writes, operations, deps: { db, loadCatalog: async () => new Map([["p1", found]]) } };
}

test("cadastro usa preço da opção e permite vários contextos do mesmo produto", async () => {
  const fixtureA = fixture(null, catalog([offer({ priceCents: 1000 }), offer({ id: "other", variantId: "v2", priceCents: 100 })]));
  await savePriceAlert("u1", { ...input, targetCents: 900 }, fixtureA.deps);
  assert.equal(fixtureA.writes.length, 1);
  assert.equal(fixtureA.writes[0].priceCondition, "pix");
  assert.equal(fixtureA.writes[0].userId, "u1");
  assert.equal(fixtureA.writes[0].contextKey, alertContextKey({ variantId: "v1", itemCondition: "NEW", priceCondition: "pix" }));
});

test("id de outra conta/produto não permite editar nem converter alerta", async () => {
  const otherUser = fixture(alert({ userId: "other" }));
  await assert.rejects(savePriceAlert("u1", { ...input, alertId: "a1" }, otherUser.deps), /não encontrado/);
  assert.equal(otherUser.writes.length, 0);
  const otherProduct = fixture(alert({ productId: "other" }));
  await assert.rejects(savePriceAlert("u1", { ...input, alertId: "a1" }, otherProduct.deps), /não encontrado/);
  assert.equal(otherProduct.writes.length, 0);
});

test("contexto forjado, variação inexistente e meta acima do preço são rejeitados", async () => {
  for (const extra of [{ variantId: "outside" }, { itemCondition: "USED" }, { priceCondition: "Clube" }, { targetCents: 1000 }]) {
    const f = fixture();
    await assert.rejects(savePriceAlert("u1", { ...input, ...extra }, f.deps));
    assert.equal(f.writes.length, 0);
  }
});

test("legado só ganha contexto após escolha explícita e preserva id", async () => {
  const f = fixture(alert({ contextKey: null, variantId: null, itemCondition: null }));
  await assert.rejects(savePriceAlert("u1", { ...input, alertId: "a1", variantId: "" }, f.deps), /Escolha/);
  assert.equal(f.writes.length, 0);
  await savePriceAlert("u1", { ...input, alertId: "a1" }, f.deps);
  assert.equal(f.writes[0].variantId, "v1");
  assert.equal(f.writes[0].deliveryStatus, "IDLE");
  assert.deepEqual(f.writes[0].revision, { increment: 1 });
});

test("edição mantém contexto salvo, não rearma submissão idêntica nem altera envio em curso", async () => {
  const f = fixture(alert({ targetCents: 700 }));
  await savePriceAlert("u1", { ...input, alertId: "a1", variantId: "forged" }, f.deps);
  assert.equal(f.writes.length, 0);
  await savePriceAlert("u1", { ...input, targetCents: 650, alertId: "a1", itemCondition: "USED" }, f.deps);
  assert.equal(f.writes[0].itemCondition, "NEW");
  const sending = fixture(alert({ deliveryStatus: "SENDING" }));
  await assert.rejects(savePriceAlert("u1", { ...input, alertId: "a1" }, sending.deps), /processado/);
  assert.equal(sending.writes.length, 0);
});

test("conflito de edição ou contexto duplicado não é tratado como sucesso", async () => {
  const stale = fixture(alert());
  stale.operations.updateMany = async () => ({ count: 0 });
  await assert.rejects(savePriceAlert("u1", { ...input, alertId: "a1" }, stale.deps), /mudou durante/);
  const duplicate = fixture();
  duplicate.operations.create = async () => { throw { code: "P2002" }; };
  await assert.rejects(savePriceAlert("u1", input, duplicate.deps), /já tem um alerta/);
});
