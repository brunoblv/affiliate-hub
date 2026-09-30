import { cheapestFirst, isEligible } from "./pricing";
import type { Offer, Product, Variant } from "./types";
import { normalizedPriceCondition } from "./history/variant";

/** A seleção explícita nunca troca silenciosamente usado por novo (ou vice-versa). */
export function selectComparison(variants: Variant[], offers: Offer[], variantId?: string, condition?: string, payment?: string) {
  const variant = variants.find((item) => item.id === variantId)
    ?? variants.find((item) => offers.some((offer) => offer.variantId === item.id && isEligible(offer)))
    ?? variants[0];
  const all = cheapestFirst(offers.filter((offer) => offer.variantId === variant?.id));
  const selectedCondition = condition === "NEW" || condition === "USED" ? condition
    : (all.find(isEligible) ?? all[0])?.condition ?? "NEW";
  const selectedOffers = all.filter((offer) => offer.condition === selectedCondition
    && (payment === undefined || normalizedPriceCondition(offer.priceCondition) === normalizedPriceCondition(payment)));
  return { variant, condition: selectedCondition, offers: selectedOffers,
    best: selectedOffers.find(isEligible) ?? null };
}

export function productHref(product: Product): string {
  const base = `/produto/${product.slug}`;
  return product.deal ? `${base}?${new URLSearchParams({
    variacao: product.deal.variantId, condicao: product.deal.condition,
  })}` : base;
}
