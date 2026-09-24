import { isEligible } from "@/lib/pricing";
import type { CatalogProduct } from "@/lib/catalog";

/** Internal editorial policy, not an AdSense approval criterion. */
export const qualityPolicy = {
  minimumDescriptionCharacters: 120,
  minimumAdsDescriptionCharacters: 240,
  minimumHistoryDays: 7,
  minimumSeoScore: 70,
  minimumAdsScore: 80,
} as const;

export interface ProductQuality {
  score: number;
  seoEligible: boolean;
  adsEligible: boolean;
  reasons: string[];
}

/** The default product page shows the first variant with a current offer. */
export function canonicalHistoryOfferId(found: CatalogProduct): string | null {
  const variant = found.product.variants.find((item) =>
    found.offers.some((offer) => offer.variantId === item.id && isEligible(offer)),
  );
  return found.offers.find((offer) => offer.variantId === variant?.id && isEligible(offer))?.id ?? null;
}

/** One policy for metadata, sitemap and the future ad renderer. */
export function evaluateProductQuality(found: CatalogProduct, hasHistoricalObservation: boolean): ProductQuality {
  const { product, content, niche, categoryName, offers } = found;
  const currentOffers = offers.filter(isEligible);
  const hasName = product.name.trim().length > 0;
  const descriptionLength = content?.description.trim().length ?? 0;
  const hasDescription = descriptionLength >= qualityPolicy.minimumDescriptionCharacters;
  const hasImage = product.images.length > 0;
  const hasCategory = Boolean(niche || categoryName);
  const hasSpecs = product.specs.some((spec) => spec.key.trim() && spec.value?.trim());
  const hasCurrentOffer = currentOffers.length > 0;
  const hasMultipleStores = new Set(currentOffers.map((offer) => offer.storeId)).size > 1;
  const reasons: string[] = [];
  if (!hasName) reasons.push("Nome ausente");
  if (!hasDescription) reasons.push("Descrição editorial publicada insuficiente");
  if (!hasImage) reasons.push("Imagem válida ausente");
  if (!hasCategory) reasons.push("Categoria ausente");
  if (!hasSpecs) reasons.push("Especificações ausentes");
  if (!hasCurrentOffer) reasons.push("Nenhuma oferta atual com link de afiliado");
  if (!hasHistoricalObservation) reasons.push("Histórico da oferta principal sem sete dias observados em uma semana");

  const score =
    (hasName ? 5 : 0) +
    (hasDescription ? 20 : 0) +
    (hasImage ? 10 : 0) +
    (hasCategory ? 10 : 0) +
    (hasSpecs ? 15 : 0) +
    (hasCurrentOffer ? 15 : 0) +
    (hasMultipleStores ? 10 : 0) +
    (hasHistoricalObservation ? 15 : 0);
  const seoEligible = reasons.length === 0 && score >= qualityPolicy.minimumSeoScore;
  const adsEligible = seoEligible && score >= qualityPolicy.minimumAdsScore &&
    descriptionLength >= qualityPolicy.minimumAdsDescriptionCharacters;
  return { score, seoEligible, adsEligible, reasons };
}
