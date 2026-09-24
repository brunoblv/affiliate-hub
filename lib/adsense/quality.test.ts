import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogProduct } from "@/lib/catalog";
import { canonicalHistoryOfferId, evaluateProductQuality } from "./quality";
import { shouldShowAds } from "./config";

function fixture(): CatalogProduct {
  return {
    product: {
      id: "product-1", slug: "item", name: "Produto completo", brand: "Marca", model: "X",
      gtin: "", categorySlug: "casa", summary: "Resumo", rating: null, reviewCount: null,
      imageCount: 1, images: [{ url: "https://example.com/item.jpg", alt: "Item", variantId: null }],
      variants: [{ id: "variant-1", label: "Padrão", attributes: {} }],
      specs: [{ key: "Material", value: "Aço" }],
      prices: { lowestCents: 10000, highestCents: 10000, previousCents: null, offerCount: 1,
        storeCount: 1, freshestMinutesAgo: 5, installmentTimes: null, installmentTotalCents: null,
        priceCondition: null },
    },
    offers: [{ id: "offer-1", productId: "product-1", variantId: "variant-1", storeId: "store-1",
      seller: "Loja", priceCents: 10000, installments: null, installmentPriceCents: null,
      priceCondition: null, shipping: { kind: "desconhecido", label: "Frete não informado" },
      availability: "em_estoque", method: "API", status: "ativo", collectedMinutesAgo: 5,
      shortCode: "tracked" }],
    stores: [{ id: "store-1", name: "Loja", method: "API" }],
    niche: { id: "niche-1", slug: "casa", name: "Casa" },
    categoryName: "Casa", createdAt: new Date("2026-09-01"),
    content: { title: "Item", summary: "Resumo", description: "Descrição original. ".repeat(16),
      benefits: [], audience: "Público", howToUse: null, limitations: [], faq: [],
      metaTitle: "Item", metaDescription: "Descrição" },
  };
}

test("produto completo e com histórico é elegível para SEO e anúncios", () => {
  const quality = evaluateProductQuality(fixture(), true);
  assert.equal(quality.score, 90);
  assert.equal(quality.seoEligible, true);
  assert.equal(quality.adsEligible, true);
});

test("sem histórico, o produto não é indexável mesmo com conteúdo completo", () => {
  const quality = evaluateProductQuality(fixture(), false);
  assert.equal(quality.seoEligible, false);
  assert.equal(quality.adsEligible, false);
  assert.match(quality.reasons.join("; "), /Histórico/);
});

test("oferta vencida e conteúdo curto bloqueiam SEO e anúncios", () => {
  const found = fixture();
  found.offers[0].collectedMinutesAgo = 60 * 25;
  found.content!.description = "Descrição breve";
  const quality = evaluateProductQuality(found, true);
  assert.equal(quality.seoEligible, false);
  assert.equal(quality.adsEligible, false);
  assert.match(quality.reasons.join("; "), /oferta atual/);
});

test("conteúdo entre 120 e 239 caracteres permite SEO mas não anúncios", () => {
  const found = fixture();
  found.content!.description = "Texto original. ".repeat(12);
  const quality = evaluateProductQuality(found, true);
  assert.equal(quality.seoEligible, true);
  assert.equal(quality.adsEligible, false);
});

test("histórico canônico acompanha a variação exibida por padrão", () => {
  const found = fixture();
  found.product.variants.push({ id: "variant-2", label: "Outra", attributes: {} });
  found.offers.unshift({ ...found.offers[0], id: "offer-2", variantId: "variant-2", priceCents: 9000 });
  assert.equal(canonicalHistoryOfferId(found), "offer-1");
});

test("publicidade permanece desligada mesmo em produto elegível", () => {
  assert.equal(shouldShowAds("/produto/item", { adsEligible: true }), false);
  assert.equal(shouldShowAds("/admin", { adsEligible: true }), false);
});
