import { Channel, type Platform } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logging";
import { buildProductPostData, type PostType, type UrgencyLevel } from "@/lib/content/product-post";
import { formatForChannel } from "@/lib/content/channel-formatters";

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
  /** Nome de exibição da plataforma de origem (ex: "Mercado Livre") — usado pelo layout multicanal. */
  marketplace?: string;
  /** Plataforma de origem (enum) — decide se o link do grupo exclusivo do TikTok Shop entra no rodapé de Facebook/Instagram. */
  productSource?: Platform;
  /** Link de afiliado já rastreado; se ausente, o texto usa o placeholder "[LINK]" do template. */
  affiliateUrl?: string;
  /** 1-3 frases sobre por que o produto interessa; se ausente, a linha é omitida (nunca inventada). */
  shortDescription?: string;
  /** Até 3 características já confirmadas do produto. */
  benefits?: string[];
  postType?: PostType;
  urgencyLevel?: UrgencyLevel;
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

/**
 * Gera conteúdo determinístico a partir de fatos do produto (fallback local,
 * sem depender de um provider de IA externo), seguindo o layout multicanal de
 * docs/template-multicanal-posts-achadinhos.md (lib/content/product-post.ts +
 * lib/content/channel-formatters.ts): ordem FOTO → TIPO → NOME → PREÇO →
 * DESCONTO → DESCRIÇÃO → BENEFÍCIOS → CTA → LINK → DISCLOSURE, adaptada por
 * canal.
 *
 * Regra fundamental: nenhum dado (preço, desconto, avaliação, vendas,
 * benefício) pode ser inventado — tudo deve vir de `input`.
 */
export async function generateContent(input: ContentGenerationInput): Promise<ContentGenerationOutput> {
  const { product, channel } = input;

  const postData = buildProductPostData({
    product,
    marketplace: input.marketplace ?? "",
    platform: input.productSource,
    shortDescription: input.shortDescription,
    benefits: input.benefits,
    postType: input.postType,
    urgencyLevel: input.urgencyLevel,
  });

  const channelPost = formatForChannel(channel, postData, input.affiliateUrl);

  const hashtags = ["#oferta", "#achadinho"];
  if (postData.postType === "PROMOTION" || postData.postType === "FLASH_DEAL" || postData.postType === "PRICE_DROP") {
    hashtags.push("#promocao");
  }

  const altVariation = `Olha essa oferta: ${product.name}!\n${channelPost.body}\n${channelPost.cta}`;

  logger.debug("CONTENT", "Conteúdo gerado (engine local)", { product: product.name, channel, postType: postData.postType });

  return {
    headline: channelPost.headline,
    description: channelPost.body,
    cta: channelPost.cta,
    hashtags,
    variations: [channelPost.fullText, altVariation],
    titleSuggestion: product.name,
    approachSuggestion: postData.discountPercent && postData.discountPercent >= 30 ? "Destacar desconto" : "Destacar benefício/uso",
  };
}
