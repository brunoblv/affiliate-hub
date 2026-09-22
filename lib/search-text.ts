/** Minúsculas e sem acento: "iPhone" e "iphone", "cafeteira" e "cafétéira" se encontram (RF-10). */
export function normalize(term: string): string {
  return term
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function productSearchText(product: {
  name: string;
  brand?: string | null;
  model?: string | null;
  gtin?: string | null;
}): string {
  return normalize([product.name, product.brand, product.model, product.gtin].filter(Boolean).join(" "));
}
