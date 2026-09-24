import assert from "node:assert/strict";
import test from "node:test";
import { createMetricToken, verifyMetricToken, metricTerm, TOKEN_LIFETIME_MS } from "./token";
import { ingestMetric } from "./ingest";
import { fillMetricDays, metricRange, noResultRate } from "./report";
import { countClick } from "./click";

const secret = "segredo-exclusivo-dos-testes";
test("token autentica dados do servidor e rejeita alteração, expiração e outro segredo", () => {
  const now = Date.now();
  const token = createMetricToken({ kind: "SEARCH", term: "CAFÉ", resultCount: 0 }, secret, now)!;
  const parsed = verifyMetricToken(token, secret, now)!;
  assert.equal(parsed.kind, "SEARCH");
  assert.ok(parsed.kind === "SEARCH" && parsed.term === "cafe" && parsed.resultCount === 0);
  const [body, sig] = token.split(".");
  const tampered = JSON.parse(Buffer.from(body, "base64url").toString());
  tampered.resultCount = 500;
  assert.equal(verifyMetricToken(`${Buffer.from(JSON.stringify(tampered)).toString("base64url")}.${sig}`, secret, now), null);
  assert.equal(verifyMetricToken(token, "outro-segredo", now), null);
  assert.equal(verifyMetricToken(token, secret, now + TOKEN_LIFETIME_MS), null);
  assert.equal(verifyMetricToken(token, secret, now - 1), null);
  assert.equal(createMetricToken({ kind: "PRODUCT_VIEW", productId: "p1" }, ""), null);
  assert.equal(verifyMetricToken("x.y", secret), null);
});
test("termos são normalizados, limitados e padrões pessoais são omitidos", () => {
  assert.equal(metricTerm("  CAFÉ elétrico "), "cafe eletrico");
  for (const term of ["pessoa@example.com", "(11) 99999-1234", "123.456.789-00", "https://loja.com/item"]) assert.equal(metricTerm(term), "[termo omitido]");
  assert.equal(metricTerm("x".repeat(300)).length, 120);
  assert.equal(metricTerm("frasco 30 ml"), "frasco 30 ml");
});
const request = (body: string, origin = "https://hub.example") => new Request("https://hub.example/api/metricas", { method: "POST", headers: { Origin: origin, "Content-Type": "text/plain" }, body });
test("ingestão entrega somente eventos autenticados, com ID estável na repetição", async () => {
  const token = createMetricToken({ kind: "PRODUCT_VIEW", productId: "p1", nicheId: "n1" }, secret)!;
  const received: string[] = [];
  const persist = async (event: { id: string }) => { received.push(event.id); };
  assert.equal((await ingestMetric(request(token), persist, secret)).status, 204);
  assert.equal((await ingestMetric(request(token), persist, secret)).status, 204);
  assert.equal(received.length, 2);
  assert.equal(received[0], received[1]); // A PK e skipDuplicates fazem a deduplicação no PostgreSQL.
  assert.equal((await ingestMetric(request(token, "https://outro.example"), persist, secret)).status, 403);
  assert.equal((await ingestMetric(request("falso"), persist, secret)).status, 400);
  assert.equal((await ingestMetric(request("x".repeat(2001)), persist, secret)).status, 413);
  assert.equal(received.length, 2);
});
test("falha ao persistir retorna 503 sem expor detalhes do banco", async () => {
  const token = createMetricToken({ kind: "SEARCH", term: "panela", resultCount: 2 }, secret)!;
  const response = await ingestMetric(request(token), async () => { throw new Error("credencial privada"); }, secret);
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "");
});
test("período usa São Paulo, permite apenas 7/30/90 dias e preenche dias vazios", () => {
  const range = metricRange("7", new Date("2026-09-24T02:30:00Z"));
  assert.equal(range.start.toISOString(), "2026-09-17T03:00:00.000Z");
  assert.equal(metricRange("999999").days, 30);
  const rows = fillMetricDays(range.start, range.days, [{ day: "2026-09-23", kind: "SEARCH", count: 3 }, { day: "2026-09-23", kind: "NO_RESULTS", count: 1 }]);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].searches, 0);
  assert.equal(rows[6].day, "2026-09-23");
  assert.equal(rows[6].searches, 3);
  assert.equal(rows[6].noResults, 1);
  assert.equal(noResultRate(0, 0), "—");
  assert.equal(noResultRate(4, 1), "25%");
});
test("pré-carregamento e HEAD não contam como cliques", () => {
  assert.equal(countClick(new Request("https://hub.example/go/a")), true);
  assert.equal(countClick(new Request("https://hub.example/go/a", { method: "HEAD" })), false);
  const cases: Record<string, string>[] = [{ purpose: "prefetch" }, { "sec-purpose": "prefetch;prerender" }, { "next-router-prefetch": "1" }];
  for (const headers of cases) assert.equal(countClick(new Request("https://hub.example/go/a", { headers })), false);
});
