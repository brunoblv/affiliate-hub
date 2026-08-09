import { Channel } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logging";

/** Dados factuais do produto — a IA não pode inventar nada além disto (spec §16). */
export interface ProductFacts {
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
}

export interface ContentGenerationInput {
  product: ProductFacts;
  channel: Channel;
}

export interface ContentGenerationOutput {
  headline: string;
  description: string;
  cta: string;
  hashtags: string[];
  variations: string[];
  titleSuggestion: string;
  approachSuggestion: string;
}

const CTAS_BY_CHANNEL: Record<Channel, string> = {
  FACEBOOK: "Garanta o seu agora 👉",
  INSTAGRAM: "Corre que acaba 🔥",
  TIKTOK: "Link na bio 🚀",
  TELEGRAM: "Aproveite antes que acabe 👇",
  WEBSITE: "Ver oferta",
  BLOG: "Confira a oferta completa",
  PINTEREST: "Salve e aproveite",
  OUTROS: "Saiba mais",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Gera conteúdo determinístico a partir de fatos do produto (fallback local,
 * sem depender de um provider de IA externo). Serve de base para o formato
 * de saída esperado quando um provider de IA real for conectado.
 *
 * Regra fundamental: nenhum dado (preço, desconto, avaliação, vendas) pode
 * ser inventado — tudo deve vir de `input.product`.
 */
export async function generateContent(input: ContentGenerationInput): Promise<ContentGenerationOutput> {
  const { product, channel } = input;
  const cta = CTAS_BY_CHANNEL[channel];

  const discountLine =
    product.discountPercent && product.originalPrice
      ? `De ${formatCurrency(product.originalPrice)} por ${formatCurrency(product.price)} (${product.discountPercent}% OFF)`
      : `Por ${formatCurrency(product.price)}`;

  const ratingLine = product.rating ? `⭐ ${product.rating.toFixed(1)}${product.reviewCount ? ` (${product.reviewCount} avaliações)` : ""}` : undefined;
  const salesLine = product.soldCount ? `${product.soldCount.toLocaleString("pt-BR")} vendidos` : undefined;

  const descriptionLines = [discountLine, ratingLine, salesLine].filter(Boolean);

  const headline = `🔥 ${product.name}`;
  const description = descriptionLines.join("\n");

  const hashtags = ["#oferta", "#promocao", "#achadinho"];

  const variations = [
    `${headline}\n\n${description}\n\n${cta}`,
    `Olha essa oferta: ${product.name}!\n${discountLine}\n${cta}`,
  ];

  logger.debug("CONTENT", "Conteúdo gerado (engine local)", { product: product.name, channel });

  return {
    headline,
    description,
    cta,
    hashtags,
    variations,
    titleSuggestion: product.name,
    approachSuggestion: product.discountPercent && product.discountPercent >= 30 ? "Destacar desconto" : "Destacar benefício/uso",
  };
}
