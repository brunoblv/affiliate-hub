import { prisma } from "@/lib/database";
import { generateContent } from "@/lib/ai";
import { logger } from "@/lib/logging";
import { Channel, ContentStatus } from "@/lib/generated/prisma/client";
import { CHANNEL_TO_CONTENT_TYPE } from "./channel-map";

export interface GenerateContentForProductOptions {
  productId: string;
  channel: Channel;
  campaignId?: string;
}

/**
 * Gera um Content a partir de um Product + canal (spec §16), usado tanto
 * pelo worker da fila `content-generation` quanto pela geração manual no
 * admin (produto/oportunidade) — mesma lógica, sem duplicação.
 */
export async function generateContentForProduct(options: GenerateContentForProductOptions) {
  const { productId, channel, campaignId } = options;

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const generated = await generateContent({
    product: {
      name: product.name,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      discountPercent: product.discountPercent ? Number(product.discountPercent) : undefined,
      rating: product.rating ? Number(product.rating) : undefined,
      reviewCount: product.reviewCount ?? undefined,
      soldCount: product.soldCount ?? undefined,
    },
    channel,
  });

  const content = await prisma.content.create({
    data: {
      projectId: product.projectId,
      productId,
      campaignId,
      type: CHANNEL_TO_CONTENT_TYPE[channel],
      title: generated.headline,
      description: generated.description,
      caption: generated.variations[0],
      hashtags: generated.hashtags.join(" "),
      imageUrl: product.imageUrl,
      status: ContentStatus.PENDING_APPROVAL,
    },
  });

  logger.info("CONTENT", `Conteúdo gerado para produto ${productId}`, { contentId: content.id, channel });

  return content;
}
