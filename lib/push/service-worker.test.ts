import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const opened: string[] = [];
  const shown: { title: string; options: { body: string } }[] = [];
  runInNewContext(readFileSync("public/push-sw.js", "utf8"), { URL, self: {
    addEventListener: (name: string, callback: (event: unknown) => void) => { handlers[name] = callback; },
    location: { origin: "https://hub.test" },
    registration: { showNotification: async (title: string, options: { body: string }) => { shown.push({ title, options }); } },
    clients: { openWindow: async (url: string) => { opened.push(url); } },
  } });
  return { handlers, opened, shown };
}

test("clique no push preserva contexto e rejeita destinos externos e rotas arbitrárias", async () => {
  const { handlers, opened } = worker();
  for (const url of ["/produto/teste?variacao=v1&condicao=USED&pagamento=pix", "https://evil.test/produto/x", "//evil.test/x", "/admin"])
    handlers.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: (promise: Promise<void>) => promise });
  assert.deepEqual(opened, ["https://hub.test/produto/teste?variacao=v1&condicao=USED&pagamento=pix",
    ...Array(3).fill("https://hub.test/conta#alertas")]);
});

test("push inválido ainda produz aviso visível genérico", () => {
  const { handlers, shown } = worker();
  handlers.push({ data: { json() { throw new Error("invalid"); } }, waitUntil: (promise: Promise<void>) => promise });
  assert.equal(shown.length, 1);
  assert.equal(shown[0].options.body, "Confira seus alertas na conta.");
});
