import { Platform } from "@/lib/generated/prisma/client";
import { ACHADINHOS_TIKTOK_PROJECT_SLUG, DISCOVERY_BUCKETS } from "./buckets";

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
 *
 * Produtos do TikTok Shop na varredura de promoções vão para Achadinhos Tik Tok
 * (projeto exclusivo dessa plataforma).
 */
export function classifyPromotionBucket(title: string, platform?: Platform): string {
  if (platform === Platform.TIKTOK_SHOP) {
    return ACHADINHOS_TIKTOK_PROJECT_SLUG;
  }

  const normalizedTitle = normalize(title);

  for (const bucket of DISCOVERY_BUCKETS) {
    // Buckets restritos a uma plataforma (ex.: Achadinhos Tik Tok → só TIKTOK_SHOP)
    // não podem "roubar" produtos de outra plataforma só por bater palavra-chave.
    if (bucket.platforms && (!platform || !bucket.platforms.includes(platform))) continue;

    const matches = bucket.keywords.some((keyword) =>
      normalize(keyword)
        .split(" ")
        .some((word) => word.length > 3 && normalizedTitle.includes(word)),
    );
    if (matches) return bucket.projectSlug;
  }

  return "meu-novo-lar";
}
