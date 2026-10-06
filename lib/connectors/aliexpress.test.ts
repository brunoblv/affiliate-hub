import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseAliExpressUrl, signAliExpress } from "./aliexpress";

test("parseAliExpressUrl aceita página do item em qualquer subdomínio e o ID cru", () => {
  const expected = { listingId: "1005012631924049", sellerId: null };
  assert.deepEqual(parseAliExpressUrl("https://pt.aliexpress.com/item/1005012631924049.html?sk=_c3sxJyKh"), expected);
  assert.deepEqual(parseAliExpressUrl("https://www.aliexpress.com/item/1005012631924049.html"), expected);
  assert.deepEqual(parseAliExpressUrl("https://www.aliexpress.us/item/1005012631924049.html"), expected);
  assert.deepEqual(parseAliExpressUrl("1005012631924049"), expected);
});

test("parseAliExpressUrl recusa outras lojas, links curtos e domínios parecidos", () => {
  assert.equal(parseAliExpressUrl("https://s.click.aliexpress.com/e/_c3sxJyKh"), null);
  assert.equal(parseAliExpressUrl("https://aliexpress.com.evil.io/item/1005012631924049.html"), null);
  assert.equal(parseAliExpressUrl("https://shopee.com.br/produto-i.123.456"), null);
});

test("signAliExpress ordena os parâmetros e assina chave+valor em HMAC-SHA256 maiúsculo", () => {
  const params = { method: "aliexpress.affiliate.productdetail.get", app_key: "123", timestamp: "1700000000000" };
  const expected = createHmac("sha256", "segredo")
    .update("app_key123methodaliexpress.affiliate.productdetail.gettimestamp1700000000000")
    .digest("hex")
    .toUpperCase();
  assert.equal(signAliExpress(params, "segredo"), expected);
});
