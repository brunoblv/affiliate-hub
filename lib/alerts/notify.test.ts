import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAlerts, type AlertStore } from "./notify";
import { mailFailure, ALERT_RETRY_MS, ALERT_SEND_TIMEOUT_MS } from "./delivery";
import { alert, catalog, now, offer } from "./test-fixtures";
import type { Mailer } from "@/lib/mail";

/** Store de teste independente do SMTP e PostgreSQL; valida o ciclo de decisões. */
function setup(initial = alert()) {
  let state = { ...initial };
  let found = catalog();
  let clock = now;
  let calls = 0;
  const store: AlertStore = {
    async recover(at) {
      if (state.deliveryStatus === "SENDING" && state.deliveryStartedAt!.getTime() < at.getTime() - ALERT_SEND_TIMEOUT_MS) {
        state.deliveryStatus = "UNCERTAIN";
      }
    },
    async list() { return [{ ...state }]; },
    async products() { return new Map([["p1", found]]); },
    async rearm(snapshot) {
      if (state.revision !== snapshot.revision || state.deliveryStatus !== "SENT") return false;
      state = { ...state, notifiedAt: null, notifiedPriceCents: null, revision: state.revision + 1,
        deliveryStatus: "IDLE", attemptCount: 0, nextAttemptAt: null };
      return true;
    },
    async claim(snapshot, _price, at) {
      if (state.revision !== snapshot.revision || state.deliveryStatus !== "IDLE") return null;
      state.deliveryStatus = "SENDING"; state.deliveryToken = "claim"; state.deliveryStartedAt = at;
      state.attemptCount++;
      return "claim";
    },
    async finish(snapshot, token, price, outcome, at) {
      if (state.revision !== snapshot.revision || state.deliveryToken !== token) return;
      state.deliveryStatus = outcome.retryAt ? "IDLE" : outcome.status;
      state.nextAttemptAt = outcome.retryAt;
      state.notifiedAt = outcome.status === "SENT" ? at : null;
      state.notifiedPriceCents = outcome.status === "SENT" ? price : null;
    },
  };
  const success: Mailer = { async send() { calls++; assert.equal(state.notifiedAt, null); } };
  return { state: () => state, calls: () => calls, store,
    setProduct: (value: ReturnType<typeof catalog>) => { found = value; },
    advance: (ms: number) => { clock = new Date(clock.getTime() + ms); },
    run: (mailer: Mailer | null = success) => evaluateAlerts({ store, mailer, now: () => clock, siteUrl: "https://example.com" }),
  };
}

test("duas avaliações só enviam uma vez e sucesso é gravado depois do transporte", async () => {
  const run = setup();
  await Promise.all([run.run(), run.run()]);
  assert.equal(run.calls(), 1);
  assert.equal(run.state().deliveryStatus, "SENT");
  assert.equal(run.state().notifiedPriceCents, 800);
  await run.run();
  assert.equal(run.calls(), 1);
});

test("outro contexto abaixo da meta não avisa nem interfere no rearmamento", async () => {
  const run = setup();
  run.setProduct(catalog([offer({ priceCents: 1200 }), offer({ id: "other", variantId: "v2", priceCents: 100 })]));
  await run.run(); assert.equal(run.calls(), 0);
  run.setProduct(catalog()); await run.run(); assert.equal(run.calls(), 1);
  run.setProduct(catalog([offer({ priceCents: 1200 }), offer({ id: "used", condition: "USED", priceCents: 100 })]));
  assert.equal((await run.run()).rearmed, 1);
  run.setProduct(catalog()); await run.run(); assert.equal(run.calls(), 2);
});

test("legados não avisam e ausência de SMTP não reserva o alerta", async () => {
  const legacy = setup(alert({ contextKey: null, variantId: null, itemCondition: null }));
  await legacy.run(); assert.equal(legacy.calls(), 0);
  const run = setup();
  assert.equal((await run.run(null)).waitingForMail, 1);
  assert.equal(run.state().attemptCount, 0);
  assert.equal(run.state().notifiedAt, null);
});

test("rejeição explícita aguarda prazo persistido e para após três tentativas", async () => {
  const run = setup();
  let failures = 0;
  const mailer: Mailer = { async send() { failures++; throw { responseCode: 451 }; } };
  await run.run(mailer);
  assert.equal(run.state().nextAttemptAt?.getTime(), now.getTime() + ALERT_RETRY_MS);
  await run.run(mailer); assert.equal(failures, 1);
  run.advance(ALERT_RETRY_MS); await run.run(mailer); assert.equal(failures, 2);
  run.advance(ALERT_RETRY_MS * 2); await run.run(mailer); assert.equal(failures, 3);
  assert.equal(run.state().deliveryStatus, "FAILED");
  run.advance(ALERT_RETRY_MS * 10); await run.run(mailer); assert.equal(failures, 3);
});

test("timeout e processo interrompido ficam incertos sem reenvio", async () => {
  const run = setup();
  await run.run({ async send() { throw { code: "ETIMEDOUT", message: "sensitive transport details" }; } });
  assert.equal(run.state().deliveryStatus, "UNCERTAIN");
  assert.equal(run.state().notifiedAt, null);
  run.advance(ALERT_RETRY_MS); await run.run(); assert.equal(run.calls(), 0);
  const interrupted = setup(alert({ deliveryStatus: "SENDING", deliveryStartedAt: new Date(now.getTime() - ALERT_SEND_TIMEOUT_MS - 1) }));
  await interrupted.run();
  assert.equal(interrupted.state().deliveryStatus, "UNCERTAIN");
  assert.equal(interrupted.calls(), 0);
});

test("reserva invalidada por edição ou exclusão não envia", async () => {
  const run = setup();
  run.store.claim = async () => null;
  await run.run();
  assert.equal(run.calls(), 0);
});

test("falha ao registrar sucesso não provoca novo envio", async () => {
  const run = setup();
  const finish = run.store.finish;
  let first = true;
  run.store.finish = async (...args) => {
    if (first) { first = false; throw new Error("Database unavailable"); }
    return finish(...args);
  };
  await run.run(); await run.run();
  assert.equal(run.calls(), 1);
  assert.equal(run.state().deliveryStatus, "UNCERTAIN");
});

test("classificação de falhas não expõe mensagens e não retenta conexão encerrada após DATA", () => {
  assert.deepEqual(mailFailure({ code: "ECONNECTION", message: "secret" }), { definite: false, code: "UNCONFIRMED" });
  assert.deepEqual(mailFailure({ code: "EAUTH", message: "secret" }), { definite: true, code: "EAUTH" });
  assert.deepEqual(mailFailure({ responseCode: 550 }), { definite: true, code: "SMTP_550" });
});
