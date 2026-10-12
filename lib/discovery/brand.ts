import { modelTokens, normalize } from "./similarity";

/**
 * Marca conhecida x genérico (A.6). Função pura, sem IA: casa a tabela de marcas com o título,
 * por palavra inteira, e usa loja oficial e código de modelo como sinais secundários.
 */
export interface BrandEntry {
  id: string;
  name: string;
  aliases: string[];
  weight: number;
}

export type Tier = "BRANDED" | "GENERIC" | "UNKNOWN";

export interface BrandResult {
  tier: Tier;
  brand: BrandEntry | null;
  /** Marcas distintas encontradas no título (mais de 3 = anúncio "compatível com"). */
  brandCount: number;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const flat = (text: string) => normalize(text).replace(/[-.]/g, " ").trim();

/** Marcas do título, na ordem em que aparecem (a primeira costuma ser a do produto). */
export function detectBrands(title: string, brands: BrandEntry[]): BrandEntry[] {
  const haystack = ` ${flat(title)} `;
  const found: { brand: BrandEntry; index: number }[] = [];
  for (const brand of brands) {
    let best = -1;
    for (const name of [brand.name, ...brand.aliases]) {
      const needle = flat(name);
      if (needle.length < 2) continue;
      const match = new RegExp(`(?<![a-z0-9])${escape(needle)}(?![a-z0-9])`).exec(haystack);
      if (match && (best === -1 || match.index < best)) best = match.index;
    }
    if (best !== -1) found.push({ brand, index: best });
  }
  return found.sort((a, b) => a.index - b.index).map((item) => item.brand);
}

export function classifyBrand(title: string, brands: BrandEntry[], officialStore: boolean | null): BrandResult {
  const found = detectBrands(title, brands);
  if (found.length > 0) return { tier: "BRANDED", brand: found[0], brandCount: found.length };
  const hasModel = modelTokens(title).size > 0;
  if (officialStore && hasModel) return { tier: "BRANDED", brand: null, brandCount: 0 };
  if (!hasModel && !officialStore) return { tier: "GENERIC", brand: null, brandCount: 0 };
  return { tier: "UNKNOWN", brand: null, brandCount: 0 };
}
