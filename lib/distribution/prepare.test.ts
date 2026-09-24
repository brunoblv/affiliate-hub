import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/lib/generated/prisma/client";
import { preparePublication } from "./prepare";

const now = new Date("2026-09-23T15:00:00Z");
const selection = { communityId: "community", linkId: "chosen-link" };
function fixture() {
  const community = { id: "community", nicheId: "niche", active: true, platform: "TELEGRAM", publicationId: "-100123", niche: { active: true } };
  const link = { id: "chosen-link", active: true, url: "https://affiliate.example/real-campaign", shortCode: "tracked",
    offer: { id: "chosen-offer", active: true, priceCents: 12990, priceCheckedAt: new Date("2026-09-23T14:00:00Z"),
      status: "ACTIVE", needsReview: false, availability: "IN_STOCK", condition: "NEW", priceCondition: null as string | null,
      shippingKind: "UNKNOWN", shippingCents: null, sellerName: "Loja", originalUrl: "https://raw-store.example/product",
      store: { active: true, name: "Marketplace" }, variant: { label: "30 ml", product: { id: "product", status: "PUBLISHED", name: "Sérum loja.example.com",
        niches: [{ nicheId: "niche" }], variants: [{ id: "variant" }] } } } };
  const creative = { id: "creative", productId: "product", status: "APPROVED", file: "creative.jpg", withPrice: true,
    priceCents: 12990, priceObservedAt: new Date("2026-09-23T14:00:00Z") };
  const db = { community: { findUnique: async () => community }, affiliateLink: { findUnique: async () => link }, creative: { findUnique: async () => creative } } as unknown as Prisma.TransactionClient;
  return { db, community, link, creative };
}

test("prepara oferta exata e nunca divulga URL crua da loja ou do título", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://hub.example";
  const { db } = fixture();
  const row = await preparePublication(db, selection, now);
  assert.equal(row.offerId, "chosen-offer");
  assert.equal(row.linkId, "chosen-link");
  assert.match(row.text, /https:\/\/hub.example\/go\/tracked/);
  assert.doesNotMatch(row.text, /raw-store|affiliate.example|loja.example.com/);
  assert.match(row.text, /Preço sem frete/);
});

test("bloqueia link inativo, produto fora do nicho e oferta sem estoque/atualidade", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://hub.example";
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => { f.link.active = false; },
    (f: ReturnType<typeof fixture>) => { f.community.niche.active = false; },
    (f: ReturnType<typeof fixture>) => { f.link.offer.variant.product.niches = []; },
    (f: ReturnType<typeof fixture>) => { f.link.offer.availability = "UNKNOWN"; },
    (f: ReturnType<typeof fixture>) => { f.link.offer.availability = "OUT_OF_STOCK"; },
    (f: ReturnType<typeof fixture>) => { f.link.offer.priceCheckedAt = new Date(now.getTime() - 86400000); },
    (f: ReturnType<typeof fixture>) => { f.link.offer.needsReview = true; },
    (f: ReturnType<typeof fixture>) => { f.link.offer.priceCents = 0; },
  ]) {
    const f = fixture(); mutate(f);
    await assert.rejects(preparePublication(f.db, selection, now));
  }
});

test("fingerprint exige nova aprovação para preço/link/destino, mas não coleta igual", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://hub.example";
  const f = fixture();
  const original = await preparePublication(f.db, selection, now);
  f.link.offer.priceCheckedAt = new Date("2026-09-23T14:30:00Z");
  assert.equal((await preparePublication(f.db, selection, now)).fingerprint, original.fingerprint);
  for (const mutate of [
    () => { f.link.offer.priceCents++; },
    () => { f.link.url = "https://affiliate.example/new-campaign"; },
    () => { f.community.publicationId = "-100456"; },
  ]) {
    const before = await preparePublication(f.db, selection, now); mutate();
    assert.notEqual((await preparePublication(f.db, selection, now)).fingerprint, before.fingerprint);
  }
});

test("capa precisa estar aprovada, com preço compatível e variação inequívoca", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://hub.example";
  const input = { ...selection, creativeId: "creative" };
  assert.equal((await preparePublication(fixture().db, input, now)).creativeId, "creative");
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => { f.creative.status = "INVALIDATED"; },
    (f: ReturnType<typeof fixture>) => { f.creative.priceCents++; },
    (f: ReturnType<typeof fixture>) => { f.link.offer.priceCondition = "Pix"; },
    (f: ReturnType<typeof fixture>) => { f.link.offer.variant.product.variants.push({ id: "other" }); },
  ]) { const f = fixture(); mutate(f); await assert.rejects(preparePublication(f.db, input, now)); }
});
