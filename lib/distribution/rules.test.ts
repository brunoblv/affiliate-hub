import assert from "node:assert/strict";
import test from "node:test";
import { affiliateTrackingUrl, scheduleDate, scheduleConflict, titleSimilarity, telegramTarget, type Slot } from "./rules";

const slot = (id: string, at: string, title = id): Slot => ({ id, productId: id, title, at: new Date(at) });
test("horário é São Paulo, calendário inválido é rejeitado", () => {
  assert.equal(scheduleDate("2026-09-23T09:30")?.toISOString(), "2026-09-23T12:30:00.000Z");
  assert.equal(scheduleDate("2026-02-30T10:00"), null);
  assert.equal(scheduleDate("2026-09-23T25:00"), null);
});
test("limita por dia local e mantém intervalo inclusive na virada de dia", () => {
  const candidate = slot("d", "2026-09-23T23:30:00-03:00");
  const existing = [slot("a", "2026-09-23T09:00:00-03:00"), slot("b", "2026-09-23T12:00:00-03:00"), slot("c", "2026-09-23T15:00:00-03:00")];
  assert.match(scheduleConflict(candidate, existing)!, /3 ofertas/);
  assert.equal(scheduleConflict(slot("d", "2026-09-24T00:00:00-03:00"), existing), null);
  assert.match(scheduleConflict(slot("x", "2026-09-24T00:00:00-03:00"), [candidate])!, /uma hora/);
});
test("deduplica títulos por 7 dias sem apagar números e medidas", () => {
  assert.equal(titleSimilarity("Sérum 30 ml", "serum 30 ML"), 1);
  assert.ok(titleSimilarity("Sérum 30 ml", "Sérum 60 ml") < 1);
  const previous = slot("a", "2026-09-23T09:00:00Z", "Panela elétrica inox 5 litros");
  assert.match(scheduleConflict(slot("b", "2026-09-25T09:00:00Z", previous.title), [previous])!, /semelhante/);
  assert.equal(scheduleConflict(slot("b", "2026-09-30T09:00:00Z", previous.title), [previous]), null);
});
test("link de divulgação é sempre /go, nunca fallback para loja", () => {
  assert.equal(affiliateTrackingUrl("https://hub.example", "abc_123"), "https://hub.example/go/abc_123");
  for (const base of [undefined, "http://hub.example", "https://localhost", "https://127.0.0.1", "https://hub.example/produto", "https://user:pass@hub.example"]) assert.throws(() => affiliateTrackingUrl(base, "abc"));
  assert.throws(() => affiliateTrackingUrl("https://hub.example", "../outro"));
  assert.equal(telegramTarget("-1001234567"), "-1001234567");
  for (const id of [null, "123", "@canal", "https://t.me/canal", "-9999999999999999"]) assert.equal(telegramTarget(id), null);
});
