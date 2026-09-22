/**
 * Similaridade entre o título de um produto da Shopee e um produto de catálogo do Mercado Livre.
 * Função pura. A regra de ouro para casar "o mesmo produto": marca + modelo batendo. Só título
 * parecido serve para sugerir, nunca para vincular sozinho.
 */

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "com", "sem", "para", "pra", "e", "ou", "em", "a", "o", "as", "os", "um", "uma",
  "kit", "novo", "nova", "original", "premium", "top", "super", "lancamento", "promocao", "oferta", "envio", "imediato",
  "pronta", "entrega", "cor", "tamanho", "unidade", "unidades", "pecas", "peca", "pcs", "un",
]);

// Medidas e especificações parecem "modelo" (têm letra e número) mas não identificam o produto.
const UNIT_SUFFIX = /\d(mbps|gbps|ghz|mhz|khz|hz|ml|l|lt|cm|mm|m|kg|g|mg|gb|tb|mb|w|kw|v|mah|ah|a|x|pol|un|pcs|lm|k|p|gr|litros|watts)$/;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras que carregam significado (sem stopwords, sem números soltos). */
export function significantTokens(text: string): Set<string> {
  const tokens = normalize(text)
    .replace(/[.\-]/g, " ")
    .split(" ")
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
  return new Set(tokens);
}

/** Códigos de modelo (ex.: AFN-40-BI -> "afn40bi"): letras + números, sem hífen, e que não sejam medida. */
export function modelTokens(text: string): Set<string> {
  const found = new Set<string>();
  for (const raw of normalize(text).split(" ")) {
    const compact = raw.replace(/[.\-]/g, "");
    if (compact.length < 4 || !/[a-z]/.test(compact) || !/\d/.test(compact)) continue;
    if (UNIT_SUFFIX.test(compact)) continue;
    if (/^\d+x\d+(x\d+)?[a-z]{0,3}$/.test(compact)) continue; // dimensões (60x45), não modelo
    found.add(compact);
  }
  return found;
}

const compact = (text: string) => normalize(text).replace(/[^a-z0-9]/g, "");

export interface MlCandidateInfo {
  name: string;
  brand: string | null;
  model: string | null;
  priceCents: number | null;
}

export interface Similarity {
  score: number;
  brandMatch: boolean;
  modelMatch: boolean;
  priceOk: boolean | null;
  reasons: string[];
}

export function compareProducts(shopee: { name: string; priceCents: number }, ml: MlCandidateInfo): Similarity {
  const reasons: string[] = [];
  const a = significantTokens(shopee.name);
  const b = significantTokens(ml.name);
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  const dice = a.size + b.size === 0 ? 0 : (2 * shared) / (a.size + b.size);
  if (dice >= 0.5) reasons.push(`${Math.round(dice * 100)}% das palavras iguais`);

  const shopeeCompact = compact(shopee.name);
  const brand = ml.brand ? compact(ml.brand) : "";
  const brandMatch = brand.length >= 3 && shopeeCompact.includes(brand);
  if (brandMatch) reasons.push(`marca ${ml.brand}`);

  const mlModelText = `${ml.model ?? ""} ${ml.name}`;
  const mlCompact = compact(mlModelText);
  const shopeeModels = modelTokens(shopee.name);
  const modelMatch = [...shopeeModels].some((token) => mlCompact.includes(token));
  if (modelMatch) reasons.push("mesmo modelo");

  let priceOk: boolean | null = null;
  if (ml.priceCents && shopee.priceCents) {
    const ratio = ml.priceCents / shopee.priceCents;
    priceOk = ratio >= 0.4 && ratio <= 2.5;
    if (!priceOk) reasons.push("preço muito diferente");
  }

  const raw = dice * 60 + (brandMatch ? 15 : 0) + (modelMatch ? 25 : 0) - (priceOk === false ? 25 : 0);
  return { score: Math.max(0, Math.min(100, Math.round(raw))), brandMatch, modelMatch, priceOk, reasons };
}

/** Consulta para a busca do catálogo: as palavras mais informativas do título, sem ruído de vendedor. */
export function buildSearchQuery(title: string, maxWords = 8): string {
  const words = normalize(title)
    .replace(/[.\-]/g, " ")
    .split(" ")
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word));
  return words.slice(0, maxWords).join(" ");
}

export const REVIEW_MIN_SCORE = 40;
export const AUTO_MIN_SCORE = 75;
/** Diferença mínima para o melhor candidato em relação ao segundo, para vincular sozinho. */
export const AUTO_MIN_LEAD = 10;

export function isAutoMatch(best: Similarity, secondScore: number | null): boolean {
  return (
    best.modelMatch &&
    best.brandMatch &&
    best.priceOk !== false &&
    best.score >= AUTO_MIN_SCORE &&
    (secondScore === null || best.score - secondScore >= AUTO_MIN_LEAD)
  );
}
