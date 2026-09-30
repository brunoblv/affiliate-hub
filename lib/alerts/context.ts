import type { CatalogProduct } from "@/lib/catalog";
import { cheapestFirst, isEligible } from "@/lib/pricing";
import { normalizedPriceCondition } from "@/lib/history/variant";

export interface AlertContext {
  variantId: string;
  itemCondition: "NEW" | "USED";
  priceCondition: string | null;
}

/** Null significa condição de pagamento desconhecida, nunca "qualquer pagamento". */
export function alertContextKey(context: AlertContext): string {
  return JSON.stringify([context.variantId, context.itemCondition, normalizedPriceCondition(context.priceCondition)]);
}

export function confirmedAlertContext(alert: {
  variantId: string | null; itemCondition: "NEW" | "USED" | null;
  priceCondition: string | null; contextKey: string | null;
}): AlertContext | null {
  if (!alert.variantId || !alert.itemCondition || !alert.contextKey) return null;
  const context = { variantId: alert.variantId, itemCondition: alert.itemCondition, priceCondition: alert.priceCondition };
  return alertContextKey(context) === alert.contextKey ? context : null;
}

export function alertOffers(found: CatalogProduct | undefined | null, context: AlertContext | null) {
  if (!found || !context || !found.product.variants.some((variant) => variant.id === context.variantId)) return [];
  return cheapestFirst(found.offers.filter((offer) => offer.variantId === context.variantId
    && offer.condition === context.itemCondition
    && normalizedPriceCondition(offer.priceCondition) === normalizedPriceCondition(context.priceCondition)));
}

export function alertLowest(found: CatalogProduct | undefined | null, context: AlertContext | null): number | null {
  return alertOffers(found, context).find(isEligible)?.priceCents ?? null;
}

export function alertProductPath(slug: string, context: AlertContext | null): string {
  return context ? `/produto/${slug}?${new URLSearchParams({
    variacao: context.variantId, condicao: context.itemCondition,
    pagamento: normalizedPriceCondition(context.priceCondition) ?? "",
  })}` : `/produto/${slug}`;
}

export function alertContextLabel(variantLabel: string, context: AlertContext): string {
  return `${variantLabel} · ${context.itemCondition === "USED" ? "Usado" : "Novo"} · ${context.priceCondition || "Condição de pagamento não informada"}`;
}
