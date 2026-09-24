import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzePriceHistory, type Observation } from "./analysis";

const DAY = 24 * 60 * 60 * 1000;
const start = Date.parse("2026-09-01T12:00:00Z");
const point = (day: number, cents: number, hour = 0): Observation => ({
  t: start + day * DAY + hour * 60 * 60 * 1000,
  cents,
});
const run = (points: Observation[], currentCents: number | null, now = start + 10 * DAY) =>
  analyzePriceHistory({ points, from: start, now, currentCents, maxAgeMs: 24 * 60 * 60 * 1000 });

test("média usa dias observados, sem preencher lacunas nem duplicar coletas do mesmo dia", () => {
  const result = run([point(0, 10000), point(0, 12000, 2), point(3, 18000), point(10, 15000)], 15000);
  assert.equal(result.observedDays, 3);
  assert.equal(result.average, 15000);
  assert.equal(result.lowest, 10000);
  assert.equal(result.lastAt, point(10, 15000).t);
  assert.equal(result.changePercent, 25);
  assert.equal(result.assessment, "insufficient");
});

test("classificação usa histórico suficiente e preço verificado agora", () => {
  const points = Array.from({ length: 8 }, (_, day) => point(day, day === 7 ? 8000 : 10000));
  const result = run(points, 8000, point(7, 8000).t);
  assert.equal(result.observedDays, 8);
  assert.equal(result.assessment, "low");
  assert.equal(result.differenceFromAveragePercent, -18);
  assert.deepEqual(result.recentChanges, [{ t: point(7, 8000).t, cents: 8000, percent: -20 }]);
});

test("coleta vencida não recebe classificação atual", () => {
  const points = Array.from({ length: 8 }, (_, day) => point(day, 10000));
  const result = run(points, 10000, point(10, 10000).t);
  assert.equal(result.assessment, "insufficient");
  assert.equal(result.lastAt, point(7, 10000).t);
});

test("dados inválidos e futuros são descartados", () => {
  const result = run([point(0, 0), point(1, 10000), point(11, 9000)], null);
  assert.equal(result.observations.length, 1);
  assert.equal(result.average, 10000);
  assert.equal(result.changePercent, null);
});

test("dias de cobertura seguem o fuso de São Paulo", () => {
  const points = [
    { t: Date.parse("2026-09-02T01:00:00Z"), cents: 10000 },
    { t: Date.parse("2026-09-02T04:00:00Z"), cents: 9000 },
  ];
  const result = analyzePriceHistory({
    points, from: Date.parse("2026-09-01T00:00:00Z"),
    now: Date.parse("2026-09-03T00:00:00Z"), currentCents: null, maxAgeMs: DAY,
  });
  assert.equal(result.observedDays, 2);
});
