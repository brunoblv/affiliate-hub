import type { CommercialContext } from "./types";

const positiveInteger = (value: number | null | undefined) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;

/** Não inventa frete grátis, parcelas ou forma de pagamento quando a fonte omite. */
export function observedCommercialContext(context?: CommercialContext) {
  const shippingKind = context?.shippingKind ?? null;
  const shippingCents = shippingKind === "FREE" ? 0
    : shippingKind === "PAID" ? positiveInteger(context?.shippingCents) : null;
  return {
    priceCondition: context?.priceCondition?.trim() || null,
    installments: positiveInteger(context?.installments),
    installmentPriceCents: positiveInteger(context?.installmentPriceCents),
    shippingKind,
    shippingCents,
  };
}
