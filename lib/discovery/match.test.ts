import assert from "node:assert/strict";
import { test } from "node:test";
import { compareAcrossStores, decideMatch, type MatchSubject } from "./match";

const subject = (patch: Partial<MatchSubject>): MatchSubject => ({
  name: "Fone JBL Tune T510BT Bluetooth Sem Fio On-Ear Original",
  priceCents: 59_900,
  brand: "JBL",
  tier: "BRANDED",
  category: null,
  ...patch,
});

test("marca + modelo iguais, preço próximo e vencedor isolado vinculam sozinhos", () => {
  const best = compareAcrossStores(subject({}), subject({ name: "JBL Tune T510BT Fone Bluetooth Sem Fio On-Ear", priceCents: 54_900 }));
  const weak = compareAcrossStores(subject({}), subject({ name: "Fone Bluetooth Sem Fio Dobrável Estéreo", brand: null, tier: "GENERIC", priceCents: 14_900 }));
  assert.equal(decideMatch(best, weak), "auto");
});

test("nenhum par de genéricos vira vínculo automático, mesmo idêntico", () => {
  const generic = subject({ name: "Organizador de gaveta multiuso grande com divisórias", brand: null, tier: "GENERIC", priceCents: 4_900 });
  const twin = { ...generic, priceCents: 4_500 };
  const match = compareAcrossStores(generic, twin);
  assert.ok(match.suggestable);
  assert.equal(decideMatch(match, undefined), "review");
});

test("marca de um lado só e genérico do outro não vincula sozinho", () => {
  const match = compareAcrossStores(subject({}), subject({ tier: "GENERIC", brand: null }));
  assert.equal(match.autoEligible, false);
  assert.notEqual(decideMatch(match, undefined), "auto");
});

test("abaixo de 75% de palavras iguais nem é sugerido", () => {
  const match = compareAcrossStores(subject({}), subject({ name: "Fone de ouvido sem fio esportivo resistente ao suor" }));
  assert.equal(match.suggestable, false);
  assert.equal(decideMatch(match, undefined), "none");
});

test("razão de preço fora de 0,6–1,6 não é sugerida", () => {
  const match = compareAcrossStores(subject({}), subject({ priceCents: 25_000 }));
  assert.equal(match.suggestable, false);
});

test("categorias raiz diferentes não são sugeridas", () => {
  const match = compareAcrossStores(subject({ category: "eletrônicos" }), subject({ category: "casa" }));
  assert.equal(match.suggestable, false);
});

test("vencedor sem folga sobre o segundo vai para revisão, não para vínculo", () => {
  const a = compareAcrossStores(subject({}), subject({ priceCents: 57_000 }));
  const b = compareAcrossStores(subject({}), subject({ priceCents: 58_000 }));
  assert.equal(decideMatch(a, b), "review");
});
