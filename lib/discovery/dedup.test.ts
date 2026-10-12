import assert from "node:assert/strict";
import { test } from "node:test";
import { dedupeByFingerprint, fingerprintOf } from "./dedup";

test("ordem das palavras e ruído de vendedor não mudam a impressão digital", () => {
  assert.equal(
    fingerprintOf("Caixa de Som Bluetooth JBL Flip 6 Original Envio Imediato"),
    fingerprintOf("JBL Flip 6 Caixa de Som Bluetooth"),
  );
});

test("produtos diferentes têm impressões diferentes", () => {
  assert.notEqual(fingerprintOf("Fone Bluetooth JBL Tune 510"), fingerprintOf("Caixa de Som JBL Flip 6"));
});

test("mantém o de maior pontuação entre repetidos (entre fontes também)", () => {
  const items = [
    { id: "shopee", fingerprint: "a b c", score: 60 },
    { id: "ali", fingerprint: "a b c", score: 72 },
    { id: "outro", fingerprint: "x y", score: 50 },
  ];
  assert.deepEqual(dedupeByFingerprint(items).map((item) => item.id), ["ali", "outro"]);
});
