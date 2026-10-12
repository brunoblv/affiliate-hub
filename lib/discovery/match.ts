import { compareProducts, isAutoMatch, significantTokens, type Similarity } from "./similarity";
import type { Tier } from "./brand";

/**
 * Correspondência entre lojas (A.7), hoje Shopee <-> AliExpress. Função pura.
 * Vínculo automático só com marca + modelo batendo e folga sobre o segundo colocado; produto
 * genérico nunca vincula sozinho. Sugestão exige palavras iguais >= 75%, razão de preço
 * entre 0,6 e 1,6 e mesma categoria (quando as duas fontes informam).
 */
export interface MatchSubject {
  name: string;
  priceCents: number;
  brand: string | null;
  tier: Tier;
  /** Raiz da categoria, quando a fonte informa. */
  category: string | null;
}

export const SUGGEST_MIN_OVERLAP = 0.75;
export const PRICE_RATIO = { min: 0.6, max: 1.6 };

export function wordOverlap(a: string, b: string): number {
  const left = significantTokens(a);
  const right = significantTokens(b);
  if (left.size + right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return (2 * shared) / (left.size + right.size);
}

export interface CrossMatch {
  similarity: Similarity;
  overlap: number;
  priceRatio: number;
  suggestable: boolean;
  /** Os dois são de marca e a sugestão vale; ainda precisa de folga sobre o segundo colocado. */
  autoEligible: boolean;
}

export function compareAcrossStores(source: MatchSubject, other: MatchSubject): CrossMatch {
  const similarity = compareProducts(
    { name: source.name, priceCents: source.priceCents },
    { name: other.name, brand: source.brand ?? other.brand, model: null, priceCents: other.priceCents },
  );
  const overlap = wordOverlap(source.name, other.name);
  const priceRatio = source.priceCents > 0 ? other.priceCents / source.priceCents : 0;
  const sameCategory = !source.category || !other.category || source.category === other.category;
  const suggestable =
    overlap >= SUGGEST_MIN_OVERLAP && priceRatio >= PRICE_RATIO.min && priceRatio <= PRICE_RATIO.max && sameCategory;
  const bothBranded = source.tier === "BRANDED" && other.tier === "BRANDED";
  return { similarity, overlap, priceRatio, suggestable, autoEligible: bothBranded && suggestable };
}

/** Destino do melhor par: vincula, pede confirmação humana ou descarta. */
export function decideMatch(best: CrossMatch | undefined, second: CrossMatch | undefined): "auto" | "review" | "none" {
  if (!best || !best.suggestable) return "none";
  if (best.autoEligible && isAutoMatch(best.similarity, second?.similarity.score ?? null)) return "auto";
  return "review";
}
