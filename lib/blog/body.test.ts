import { test } from "node:test";
import assert from "node:assert/strict";
import {
  autoSummary,
  ensureProductShortcodes,
  insertImageBeforeProduct,
  isAllowedCta,
  narrationText,
  referencedImages,
  referencedProducts,
  replaceProductSection,
  splitBlocks,
} from "./body";

test("splitBlocks separa markdown, cards de produto e botões em linha própria", () => {
  const blocks = splitBlocks("Intro.\n\n[produto:pote-a]\n\\[produto:pote-b]\n\n[cta:https://meli.la/x|Ver lista]\n\nFim.");
  assert.deepEqual(blocks, [
    { kind: "markdown", content: "Intro." },
    { kind: "product", slug: "pote-a" },
    { kind: "product", slug: "pote-b" },
    { kind: "cta", url: "https://meli.la/x", label: "Ver lista" },
    { kind: "markdown", content: "Fim." },
  ]);
});

test("shortcode no meio do parágrafo e CTA para loja crua continuam texto", () => {
  const blocks = splitBlocks("Veja [produto:pote-a] aqui.\n\n[cta:https://loja.com/x]");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]!.kind, "markdown");
});

test("isAllowedCta aceita só encurtadores de afiliado e /go", () => {
  assert.equal(isAllowedCta("https://meli.la/abc"), true);
  assert.equal(isAllowedCta("https://s.click.aliexpress.com/e/_abc"), true);
  assert.equal(isAllowedCta("https://s.shopee.com.br/abc"), true);
  assert.equal(isAllowedCta("/go/abc123"), true);
  assert.equal(isAllowedCta("http://meli.la/abc"), false);
  assert.equal(isAllowedCta("https://meli.la.evil.com/abc"), false);
  assert.equal(isAllowedCta("https://www.mercadolivre.com.br/p/MLB1"), false);
});

test("referências de produto e imagem saem na ordem, sem repetir imagem", () => {
  const body = "![a](/midia/1.webp)\n\n[produto:b]\n\n[produto:a]\n\n![c](/midia/1.webp)";
  assert.deepEqual(referencedProducts(body), ["b", "a"]);
  assert.deepEqual(referencedImages(body), ["/midia/1.webp"]);
});

test("autoSummary limpa marcação e corta na palavra", () => {
  const summary = autoSummary("## Título\n\nTexto com **negrito** e [link](https://x.com).\n\n[produto:a]", 30);
  assert.equal(summary, "Título Texto com negrito e…");
});

test("ensureProductShortcodes remove URL crua, slug estranho e acrescenta o que faltou", () => {
  const body = ensureProductShortcodes("# Título\n\nVeja https://loja.com/x\n\n[produto:intruso]\n\n[produto:a]", ["a", "b"]);
  assert.equal(body, "Veja\n\n[produto:a]\n\n[produto:b]\n");
});

test("insertImageBeforeProduct não duplica imagem já posicionada", () => {
  const once = insertImageBeforeProduct("## A\n\n[produto:a]", "a", "![x](/midia/x.webp)");
  assert.equal(once, "## A\n\n![x](/midia/x.webp)\n\n[produto:a]");
  assert.equal(insertImageBeforeProduct(once, "a", "![y](/midia/y.webp)"), once);
});

test("replaceProductSection troca card, imagem e título da seção", () => {
  const body = "## Pote velho\n\nTexto.\n\n![v](/midia/v.webp)\n\n[produto:velho]\n\n## Outro\n\n[produto:outro]";
  assert.equal(
    replaceProductSection(body, "velho", "novo", "Pote novo", "![n](/midia/n.webp)"),
    "## Pote novo\n\nTexto.\n\n![n](/midia/n.webp)\n\n[produto:novo]\n\n## Outro\n\n[produto:outro]",
  );
  assert.equal(
    replaceProductSection(body, "velho", "novo", "Pote novo", null),
    "## Pote novo\n\nTexto.\n\n\n[produto:novo]\n\n## Outro\n\n[produto:outro]",
  );
});

test("narrationText tira shortcodes, imagens e marcação", () => {
  assert.equal(narrationText("Título", "## Seção\n\nTexto **forte**.\n\n[produto:a]\n\n![x](/m.webp)"), "Título.\n\nSeção\n\nTexto forte.");
  assert.throws(() => narrationText("", "[produto:a]"));
});
