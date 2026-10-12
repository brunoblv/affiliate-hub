import assert from "node:assert/strict";
import { test } from "node:test";
import { selectForImport, type Selectable } from "./selection";

const make = (n: number, tier: Selectable["tier"], score: number, group = "g", source = "SHOPEE_API") => ({
  id: `${tier}-${n}`, tier, score, group, source,
});
const options = { total: 10, brandedMinPct: 40, genericMaxPct: 50, perGroup: 10 };

test("garante o mínimo de marca mesmo com genéricos de pontuação maior", () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => make(i, "GENERIC", 90 - i)),
    ...Array.from({ length: 6 }, (_, i) => make(i, "BRANDED", 60 - i)),
  ];
  const picked = selectForImport(pool, options);
  assert.ok(picked.filter((item) => item.tier === "BRANDED").length >= 4);
});

test("respeita o teto de genéricos e deixa vaga sobrando em vez de estourar", () => {
  const pool = Array.from({ length: 20 }, (_, i) => make(i, "GENERIC", 90 - i));
  const picked = selectForImport(pool, options);
  assert.equal(picked.length, 5);
});

test("teto por grupo impede um nicho de dominar a leva", () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => make(i, "BRANDED", 90 - i, "cozinha")),
    ...Array.from({ length: 5 }, (_, i) => make(i, "BRANDED", 50 - i, "audio")),
  ];
  const picked = selectForImport(pool, { ...options, perGroup: 4 });
  assert.equal(picked.filter((item) => item.group === "cozinha").length, 4);
  assert.equal(picked.filter((item) => item.group === "audio").length, 4);
});

test("cota por fonte divide a rodada", () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => make(i, "BRANDED", 90 - i, `s${i}`, "SHOPEE_API")),
    ...Array.from({ length: 10 }, (_, i) => make(i, "BRANDED", 70 - i, `a${i}`, "ALIEXPRESS_API")),
  ];
  const picked = selectForImport(pool, { ...options, perSource: { SHOPEE_API: 5, ALIEXPRESS_API: 5 } });
  assert.equal(picked.filter((item) => item.source === "SHOPEE_API").length, 5);
  assert.equal(picked.filter((item) => item.source === "ALIEXPRESS_API").length, 5);
});

test("nunca passa do total", () => {
  const pool = Array.from({ length: 30 }, (_, i) => make(i, "BRANDED", 90 - i, `g${i}`));
  assert.equal(selectForImport(pool, options).length, 10);
});
