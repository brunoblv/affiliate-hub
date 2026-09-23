import assert from "node:assert/strict";
import test from "node:test";
import { communityInvite } from "./validation";

test("aceita convites dos quatro tipos, inclusive convites privados Telegram", () => {
  for (const [url, platform, kind] of [
    ["https://chat.whatsapp.com/Abc123", "WHATSAPP", "GROUP"],
    ["https://whatsapp.com/channel/Abc123", "WHATSAPP", "CHANNEL"],
    ["https://t.me/grupoteste", "TELEGRAM", "GROUP"],
    ["https://t.me/canalteste", "TELEGRAM", "CHANNEL"],
    ["https://t.me/+abc-123", "TELEGRAM", "GROUP"],
    ["https://t.me/joinchat/abc123", "TELEGRAM", "GROUP"],
  ]) assert.equal(communityInvite(url, platform, kind), url);
});

test("rejeita plataformas trocadas, URLs arbitrárias e rotas de serviço", () => {
  for (const url of ["javascript:alert(1)", "http://t.me/canalteste", "https://t.me.evil.com/canalteste", "https://t.me@evil.com/canalteste", "https://user@t.me/canalteste", "https://t.me:8443/canalteste", "https://t.me/share/url", "https://t.me/proxy", "https://t.me/canalteste?redirect=evil", "https://t.me/canalteste#fragment", "https://127.0.0.1/canalteste", "https://t.me/"]) {
    assert.equal(communityInvite(url, "TELEGRAM", "CHANNEL"), null, url);
  }
  assert.equal(communityInvite("https://chat.whatsapp.com/Abc123", "WHATSAPP", "CHANNEL"), null);
  assert.equal(communityInvite("https://t.me/canalteste", "WHATSAPP", "GROUP"), null);
  assert.equal(communityInvite("https://t.me/canalteste", "TELEGRAM", "INVALID"), null);
});
