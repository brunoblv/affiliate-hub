import type { CatalogProduct } from "@/lib/catalog";
import type { Offer } from "@/lib/types";
import type { AlertSnapshot } from "./notify";
import { alertContextKey } from "./context";

export const context = { variantId: "v1", itemCondition: "NEW" as const, priceCondition: "pix" };
export const now = new Date("2026-09-28T15:00:00Z");
export function offer(extra: Partial<Offer> = {}): Offer {
  return { id: "o1", productId: "p1", variantId: "v1", condition: "NEW", storeId: "store1",
    seller: "Loja", priceCents: 800, installments: null, installmentPriceCents: null,
    priceCondition: "Pix", shipping: { kind: "desconhecido", label: "Frete não informado" },
    availability: "em_estoque", method: "API", status: "ativo", collectedMinutesAgo: 1,
    shortCode: "affiliated", ...extra };
}
export function catalog(offers = [offer()]): CatalogProduct {
  return {
    product: { id: "p1", slug: "produto", name: "Produto", brand: "Marca", model: "Modelo", gtin: "",
      categorySlug: "casa", summary: "", rating: null, reviewCount: null, imageCount: 0, images: [], specs: [],
      variants: [{ id: "v1", label: "110 V", attributes: {} }, { id: "v2", label: "220 V", attributes: {} }],
      prices: { lowestCents: 1, highestCents: 2000, previousCents: null, offerCount: offers.length,
        storeCount: 1, freshestMinutesAgo: 1, installmentTimes: null, installmentTotalCents: null, priceCondition: null },
    }, offers, stores: [], niche: null, categoryName: null, createdAt: now, content: null,
  };
}
export function alert(extra: Partial<AlertSnapshot> = {}): AlertSnapshot {
  return { id: "a1", userId: "u1", productId: "p1", ...context, contextKey: alertContextKey(context),
    revision: 0, targetCents: 900, notifiedAt: null, notifiedPriceCents: null, createdAt: now,
    deliveryStatus: "IDLE", deliveryToken: null, deliveryStartedAt: null, nextAttemptAt: null,
    attemptCount: 0, user: { email: "test@example.invalid", name: "Teste" }, ...extra };
}
