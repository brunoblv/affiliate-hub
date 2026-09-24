import assert from "node:assert/strict";
import test from "node:test";
import { sendTelegram } from "./telegram";

const token = "123:fake_test_token";
const payload = { targetId: "-100123", text: "Produto\nhttps://hub.example/go/abc" };
const reply = (body: unknown, status = 200) => (async () => Response.json(body, { status })) as typeof fetch;

test("envia texto sem HTML e retorna ID confirmado (fetch simulado)", async () => {
  const fakeFetch: typeof fetch = async (url, options) => {
    assert.match(String(url), /sendMessage$/);
    const body = options?.body as FormData;
    assert.equal(body.get("text"), payload.text);
    assert.equal(body.get("chat_id"), payload.targetId);
    assert.equal(body.has("parse_mode"), false);
    return Response.json({ ok: true, result: { message_id: 17 } });
  };
  assert.deepEqual(await sendTelegram(payload, token, fakeFetch), { status: "SENT", externalId: "17" });
});
test("envia a capa aprovada por upload sem expor URL administrativa", async () => {
  const fakeFetch: typeof fetch = async (url, options) => {
    assert.match(String(url), /sendPhoto$/);
    const form = options?.body as FormData;
    assert.ok(form.get("photo") instanceof Blob);
    assert.equal(form.get("caption"), payload.text);
    return Response.json({ ok: true, result: { message_id: 18 } });
  };
  assert.equal((await sendTelegram({ ...payload, photo: Buffer.from("imagem-simulada") }, token, fakeFetch)).status, "SENT");
});
test("só 429 explícito permite retry; timeout e 5xx ficam incertos", async () => {
  assert.deepEqual(await sendTelegram(payload, token, reply({ ok: false, error_code: 429, parameters: { retry_after: 120 } }, 429)), { status: "RETRY", error: "Limite temporário do Telegram.", retryAfter: 120 });
  assert.equal((await sendTelegram(payload, token, reply({ ok: false, error_code: 403 }, 403))).status, "FAILED");
  assert.equal((await sendTelegram(payload, token, reply({ ok: false, error_code: 500 }, 500))).status, "UNCERTAIN");
  const result = await sendTelegram(payload, token, async () => { throw new Error(`secret ${token}`); });
  assert.equal(result.status, "UNCERTAIN");
  assert.ok(!JSON.stringify(result).includes(token));
});
test("limite de legenda não vira segundo post nem descarta capa silenciosamente", async () => {
  const neverFetch: typeof fetch = async () => { assert.fail("Não deve chamar API"); };
  assert.equal((await sendTelegram({ ...payload, text: "x".repeat(1025), photo: Buffer.from("fake") }, token, neverFetch)).status, "FAILED");
  assert.equal((await sendTelegram(payload, "", neverFetch)).status, "FAILED");
});
