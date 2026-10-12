import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyBrand, detectBrands, type BrandEntry } from "./brand";

const brands: BrandEntry[] = [
  { id: "1", name: "JBL", aliases: [], weight: 2 },
  { id: "2", name: "Xiaomi", aliases: ["redmi"], weight: 2 },
  { id: "3", name: "Mondial", aliases: [], weight: 1 },
  { id: "4", name: "Black+Decker", aliases: ["black decker"], weight: 2 },
];

test("marca no começo do título é reconhecida", () => {
  const result = classifyBrand("JBL Flip 6 Caixa de Som Bluetooth", brands, null);
  assert.equal(result.tier, "BRANDED");
  assert.equal(result.brand?.name, "JBL");
});

test("apelido da marca conta", () => {
  const result = classifyBrand("Smartphone Redmi Note 13 128GB", brands, null);
  assert.equal(result.brand?.name, "Xiaomi");
});

test("palavra inteira: marca dentro de outra palavra não casa", () => {
  assert.equal(detectBrands("Kit jblocos organizadores", brands).length, 0);
  assert.equal(detectBrands("Fone compatível com JBL", brands).length, 1);
});

test("título com várias marcas é contado para o portão de 'compatível com'", () => {
  const result = classifyBrand("Capa compatível com JBL Xiaomi Mondial Black Decker", brands, null);
  assert.equal(result.brandCount, 4);
});

test("sem marca e sem código de modelo é genérico", () => {
  assert.equal(classifyBrand("Organizador de gaveta multiuso grande", brands, null).tier, "GENERIC");
});

test("sem marca mas com código de modelo e loja oficial vira marca; sem loja oficial fica indefinido", () => {
  assert.equal(classifyBrand("Aspirador AFN40BI portátil", brands, true).tier, "BRANDED");
  assert.equal(classifyBrand("Aspirador AFN40BI portátil", brands, null).tier, "UNKNOWN");
});
