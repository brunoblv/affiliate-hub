import assert from "node:assert/strict";
import { test } from "node:test";
import type { RawCandidate } from "@/lib/connectors/types";
import { DEFAULT_BLOCKED_TERMS, evaluateGates } from "./gates";

const good: RawCandidate = {
  externalListingId: "1",
  externalSellerId: "9",
  sellerName: "Loja",
  officialStore: null,
  title: "Escorredor de louça dobrável em aço inox",
  imageUrl: "https://img/1.jpg",
  priceCents: 8_990,
  previousPriceCents: null,
  salesCount: 300,
  ratingCentis: 480,
  ratingCount: 100,
  commissionPct: 800,
  discountPct: null,
  categoryPath: [],
  observedAt: new Date(0),
};
const options: { blockedTerms: string[]; brandCount: number; maxPriceCents?: number } = { blockedTerms: DEFAULT_BLOCKED_TERMS, brandCount: 0 };
const gate = (patch: Partial<RawCandidate>, extra: Partial<typeof options> = {}) =>
  evaluateGates({ ...good, ...patch }, { ...options, ...extra });

test("candidato bom passa", () => assert.equal(gate({}), null));
test("sem imagem", () => assert.equal(gate({ imageUrl: null }), "sem foto"));
test("título curto", () => assert.equal(gate({ title: "Escorredor" }), "título curto"));
test("preço abaixo de R$ 20", () => assert.equal(gate({ priceCents: 1_999 }), "preço baixo"));
test("preço acima do teto da pauta", () => assert.equal(gate({ priceCents: 90_000 }, { maxPriceCents: 50_000 }), "preço acima do teto"));
test("nota baixa quando informada", () => assert.equal(gate({ ratingCentis: 440 }), "nota baixa"));
test("nota ausente não reprova", () => assert.equal(gate({ ratingCentis: null }), null));
test("poucas vendas quando informadas", () => assert.equal(gate({ salesCount: 9 }), "poucas vendas"));
test("vendas ausentes não reprovam", () => assert.equal(gate({ salesCount: null }), null));
test("comissão ausente ou zero", () => {
  assert.equal(gate({ commissionPct: null }), "sem comissão");
  assert.equal(gate({ commissionPct: 0 }), "sem comissão");
});
test("termo bloqueado, por palavra inteira", () => {
  assert.equal(gate({ title: "Tênis réplica importado esportivo masculino" }), "termo bloqueado");
  assert.equal(gate({ title: "Fone similar ao original bluetooth sem fio" }), "termo bloqueado");
  // "armário" contém "arma" mas não é a palavra
  assert.equal(gate({ title: "Armário organizador multiuso de plástico" }), null);
});
test("mais de 3 marcas no título", () => assert.equal(gate({}, { brandCount: 4 }), "título com várias marcas"));
