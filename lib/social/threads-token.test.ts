import assert from "node:assert/strict";
import test from "node:test";
import { isRefreshDue, openToken, REFRESH_BEFORE_MS, sealToken } from "./threads-token";

test("token cifrado volta igual com o mesmo segredo e falha com outro", () => {
  const sealed = sealToken("THAA-segredo", "s1");
  assert.ok(!sealed.includes("THAA"));
  assert.equal(openToken(sealed, "s1"), "THAA-segredo");
  assert.equal(openToken(sealed, "s2"), null);
  assert.equal(openToken("lixo", "s1"), null);
});

test("renova sem validade conhecida ou dentro da janela de 7 dias", () => {
  const now = Date.UTC(2026, 9, 4);
  assert.equal(isRefreshDue(null, now), true);
  assert.equal(isRefreshDue(new Date(now + REFRESH_BEFORE_MS), now), true);
  assert.equal(isRefreshDue(new Date(now + REFRESH_BEFORE_MS + 60_000), now), false);
});
