import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { generateContent } from "@/lib/ai";
import { getPublisher } from "@/lib/publishing";
import { getSiteUrl } from "@/lib/site-url";
import { marketplaceLabel } from "@/lib/content/product-post";
import { toProductFacts } from "./product-facts";
import {
  Channel,
  ContentStatus,
  PublicationStatus,
  type AffiliateLink,
  type Product,
} from "@/lib/generated/prisma/client";
import { CHANNEL_TO_CONTENT_TYPE } from "@/lib/content/channel-map";

export interface PublishToChannelGroupResult {
  published: number;
  skipped: number;
  failed: number;
}

/**
 * Publica automaticamente em todo ProjectChannel ativo de `channel` (Telegram
 * ou WhatsApp — ambos têm envio direto por API/Baileys, ao contrário dos
 * grupos do Facebook que exigem o fluxo assistido da Central de Grupos, ver
 * lib/affiliate/publish-to-facebook.ts).
 */
export async function publishToChannelGroups(
  product: Product,
  link: AffiliateLink,
  channel: typeof Channel.TELEGRAM | typeof Channel.WHATSAPP,
): Promise<PublishToChannelGroupResult> {
  const channels = await prisma.projectChannel.findMany({
    where: { projectId: product.projectId, active: true, platform: channel },
  });

  const result: PublishToChannelGroupResult = { published: 0, skipped: 0, failed: 0 };

  if (channels.length === 0) {
    logger.warn("PUBLISH", `Nenhum canal ${channel} cadastrado para o projeto — nada a publicar`, {
      productId: product.id,
      projectId: product.projectId,
    });
    return result;
  }

  const trackedUrl = `${getSiteUrl()}/go/${link.shortCode}`;
  const generated = await generateContent({
    product: toProductFacts(product),
    channel,
    marketplace: marketplaceLabel(product.source),
    productSource: product.source,
    affiliateUrl: trackedUrl,
  });

  const content = await prisma.content.create({
    data: {
      projectId: product.projectId,
      productId: product.id,
      type: CHANNEL_TO_CONTENT_TYPE[channel],
      title: generated.headline,
      description: generated.description,
      caption: generated.variations[0],
      hashtags: generated.hashtags.join(" "),
      imageUrl: product.imageUrl,
      status: ContentStatus.APPROVED,
    },
  });

  for (const projectChannel of channels) {
    if (!projectChannel.externalChatId) {
      logger.warn("PUBLISH", `Canal ${channel} sem externalChatId configurado — pulando`, { channelId: projectChannel.id });
      result.skipped += 1;
      continue;
    }

    const cooldownCutoff = new Date(Date.now() - projectChannel.cooldownDays * 24 * 60 * 60 * 1000);
    const recent = await prisma.publication.findFirst({
      where: { projectChannelId: projectChannel.id, content: { productId: product.id }, createdAt: { gte: cooldownCutoff } },
    });
    if (recent) {
      result.skipped += 1;
      continue;
    }

    const publication = await prisma.publication.create({
      data: {
        contentId: content.id,
        channel,
        projectChannelId: projectChannel.id,
        status: PublicationStatus.PUBLISHING,
        scheduledAt: new Date(),
        attempts: 1,
      },
    });

    try {
      const publisher = getPublisher(channel, { chatId: projectChannel.externalChatId });
      const publishResult = await publisher.publish(content);

      await prisma.publication.update({
        where: { id: publication.id },
        data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date(), externalPostId: publishResult.externalPostId },
      });
      await prisma.projectChannel.update({ where: { id: projectChannel.id }, data: { lastPublishedAt: new Date() } });

      result.published += 1;
    } catch (error) {
      await prisma.publication.update({
        where: { id: publication.id },
        data: { status: PublicationStatus.FAILED, error: error instanceof Error ? error.message : String(error) },
      });
      logger.error("PUBLISH", `${channel}: falha ao publicar no grupo`, { channelId: projectChannel.id, error });
      result.failed += 1;
    }
  }

  return result;
}
