import { DISCOVERY_BUCKETS } from "./buckets";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Classifica um título de produto encontrado na varredura genérica de
 * promoções (spec §2) num dos buckets por projeto, usando as mesmas
 * palavras-chave da busca por categoria — sem isso, tudo cairia sempre em
 * "meu-novo-lar" por ser o bucket padrão.
 */
export function classifyPromotionBucket(title: string): string {
  const normalizedTitle = normalize(title);

  for (const bucket of DISCOVERY_BUCKETS) {
    const matches = bucket.keywords.some((keyword) =>
      normalize(keyword)
        .split(" ")
        .some((word) => word.length > 3 && normalizedTitle.includes(word)),
    );
    if (matches) return bucket.projectSlug;
  }

  return "meu-novo-lar";
}
