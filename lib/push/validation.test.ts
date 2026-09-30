import test from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import { parseSubscription, validEndpoint, sameOrigin, pushFailure } from "./validation";
import { pushConfig } from "./config";

test("push rejeita endpoints arbitrários, credenciais, portas e domínio parecido", () => {
  for (const url of ["http://fcm.googleapis.com/send/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.evil.test/x",
    "https://evil.test@fcm.googleapis.com/x", "https://fcm.googleapis.com:444/x", "https://fcm.googleapis.com/x#secret"])
    assert.equal(validEndpoint(url), false, url);
  for (const url of ["https://fcm.googleapis.com/fcm/send/x", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://web.push.apple.com/x"])
    assert.equal(validEndpoint(url), true);
});

test("inscrição exige chave P-256 válida e segredo de 16 bytes", () => {
  const pair = createECDH("prime256v1"); pair.generateKeys();
  const input = { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: pair.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
  assert.ok(parseSubscription(input));
  assert.equal(parseSubscription({ ...input, keys: { ...input.keys, p256dh: "a".repeat(87) } }), null);
  assert.equal(parseSubscription({ ...input, keys: { ...input.keys, auth: "short" } }), null);
});

test("mutação exige origem exata e não aceita ausência de Origin", () => {
  assert.equal(sameOrigin(new Request("https://hub.test/api/push", { headers: { Origin: "https://hub.test" } })), true);
  assert.equal(sameOrigin(new Request("https://hub.test/api/push", { headers: { Origin: "https://evil.test" } })), false);
  assert.equal(sameOrigin(new Request("https://hub.test/api/push")), false);
});

test("expiração remove inscrição; rejeição temporária permite retry; timeout fica incerto", () => {
  assert.equal(pushFailure({ statusCode: 410 }).expired, true);
  assert.equal(pushFailure({ statusCode: 404 }).expired, true);
  assert.equal(pushFailure({ statusCode: 429 }).retry, true);
  assert.equal(pushFailure({ statusCode: 503 }).retry, true);
  assert.equal(pushFailure({ statusCode: 403 }).retry, false);
  assert.equal(pushFailure(new Error("timeout")).status, "UNCERTAIN");
});

test("configuração incompleta ou par VAPID incompatível desabilita push", () => {
  const pair = createECDH("prime256v1"); pair.generateKeys();
  const env = { VAPID_PUBLIC_KEY: pair.getPublicKey().toString("base64url"), VAPID_PRIVATE_KEY: pair.getPrivateKey().toString("base64url"), VAPID_SUBJECT: "mailto:contact@example.test" };
  assert.ok(pushConfig(env));
  assert.equal(pushConfig({}), null);
  assert.equal(pushConfig({ ...env, VAPID_PUBLIC_KEY: "invalid" }), null);
});
