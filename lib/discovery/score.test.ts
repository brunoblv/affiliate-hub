import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreCandidate, type ScoreInput } from "./score";

const base: ScoreInput = {
  salesCount: 5_000,
  ratingCentis: 480,
  ratingCount: 1_200,
  brandWeight: 0,
  officialStore: null,
  discountPct: 20,
  commissionPct: 800,
  priceCents: 12_900,
  hasImage: true,
};

test("sem foto zera a pontuação", () => {
  assert.equal(scoreCandidate({ ...base, hasImage: false }).value, 0);
});

test("demanda pesa mais que desconto", () => {
  const demand = scoreCandidate({ ...base, salesCount: 10_000 }).value;
  const noDemand = scoreCandidate({ ...base, salesCount: 20 }).value;
  assert.ok(demand - noDemand >= 15);
});

test("sem volume mínimo de vendas o teto é 35", () => {
  const score = scoreCandidate({ ...base, salesCount: 3, brandWeight: 2 });
  assert.ok(score.value <= 35);
});

test("nota 5,0 com 3 avaliações vale menos que 4,7 com 2 mil", () => {
  const few = scoreCandidate({ ...base, ratingCentis: 500, ratingCount: 3 });
  const many = scoreCandidate({ ...base, ratingCentis: 470, ratingCount: 2_000 });
  assert.ok(many.value > few.value);
});

test("nota alta com pouquíssimas avaliações não passa de 50", () => {
  const score = scoreCandidate({ ...base, ratingCentis: 500, ratingCount: 4, brandWeight: 2, salesCount: 20_000 });
  assert.ok(score.value <= 50);
});

test("nota ausente não reprova nem pontua confiança", () => {
  const absent = scoreCandidate({ ...base, ratingCentis: null, ratingCount: null });
  const lowTrust = scoreCandidate({ ...base, ratingCentis: 360, ratingCount: 2_000 });
  assert.ok(absent.value >= lowTrust.value - 5);
  assert.ok(!absent.reasons.some((reason) => reason.includes("nota")));
});

test("marca forte e loja oficial puxam a pontuação para cima", () => {
  const generic = scoreCandidate(base).value;
  const branded = scoreCandidate({ ...base, brandWeight: 2, officialStore: true }).value;
  assert.ok(branded - generic >= 14);
});

test("o total nunca passa de 100", () => {
  const score = scoreCandidate({ ...base, salesCount: 900_000, brandWeight: 2, officialStore: true, discountPct: 90, commissionPct: 5_000 });
  assert.ok(score.value <= 100);
});
