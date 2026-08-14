import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { generateContent } from "@/lib/ai";
import { nextAvailableTime } from "@/lib/autopilot";
import { getSiteUrl } from "@/lib/site-url";
import {
  Channel,
  ContentStatus,
  ContentType,
  PublicationStatus,
  ProjectChannelType,
  type AffiliateLink,
  type Product,
} from "@/lib/generated/prisma/client";
import { toProductFacts } from "./product-facts";
import { marketplaceLabel } from "@/lib/content/product-post";

export interface PublishToFacebookResult {
  pagePublished: number;
  groupsQueued: number;
  skipped: number;
}

/**
 * Enfileira a publicação no Facebook do projeto do produto assim que o link
 * de afiliado é cadastrado (docs/especificacao-automacao-produtos-chartfm.md
 * §13/§14): a Página entra na fila `Publication` (QUEUED) para o próximo
 * horário configurado em /admin/schedules (nextAvailableTime) — sem isso,
 * publica imediatamente, mesmo comportamento de antes. O schedulerTick
 * publica de fato quando o horário vence, com espaçamento entre produtos em
 * vez de tudo em rajada. Grupos públicos entram na fila da Central de Grupos
 * (fluxo assistido — o sistema NÃO tenta publicar em grupos via API, spec
 * §14).
 *
 * Gera uma única Content compartilhada e cria uma Publication por canal
 * (Página + cada grupo), respeitando o cooldown configurado em cada canal.
 */
export async function publishToFacebook(product: Product, link: AffiliateLink): Promise<PublishToFacebookResult> {
  const channels = await prisma.projectChannel.findMany({
    where: {
      projectId: product.projectId,
      active: true,
      platform: Channel.FACEBOOK,
      type: { in: [ProjectChannelType.PUBLIC_PAGE, ProjectChannelType.PUBLIC_GROUP] },
    },
  });

  const result: PublishToFacebookResult = { pagePublished: 0, groupsQueued: 0, skipped: 0 };

  if (channels.length === 0) {
    logger.warn("PUBLISH", "Nenhum canal do Facebook (Página/Grupo) cadastrado para o projeto — nada a publicar", {
      productId: product.id,
      projectId: product.projectId,
    });
    return result;
  }

  const trackedUrl = `${getSiteUrl()}/go/${link.shortCode}`;
  const generated = await generateContent({
    product: toProductFacts(product),
    channel: Channel.FACEBOOK,
    marketplace: marketplaceLabel(product.source),
    productSource: product.source,
    affiliateUrl: trackedUrl,
  });
  const caption = generated.variations[0];

  const content = await prisma.content.create({
    data: {
      projectId: product.projectId,
      productId: product.id,
      type: ContentType.FACEBOOK_POST,
      title: generated.headline,
      description: generated.description,
      caption,
      hashtags: generated.hashtags.join(" "),
      imageUrl: product.imageUrl,
      status: ContentStatus.APPROVED,
    },
  });

  for (const channel of channels) {
    if (channel.type === ProjectChannelType.PUBLIC_GROUP && !channel.allowLinks) {
      result.skipped += 1;
      continue;
    }

    const cooldownCutoff = new Date(Date.now() - channel.cooldownDays * 24 * 60 * 60 * 1000);
    const recent = await prisma.publication.findFirst({
      where: { projectChannelId: channel.id, content: { productId: product.id }, createdAt: { gte: cooldownCutoff } },
    });
    if (recent) {
      result.skipped += 1;
      continue;
    }

    if (channel.type === ProjectChannelType.PUBLIC_PAGE) {
      if (!channel.externalPageId) {
        logger.warn("PUBLISH", "Canal PUBLIC_PAGE sem externalPageId configurado — pulando publicação automática", {
          channelId: channel.id,
        });
        result.skipped += 1;
        continue;
      }

      await prisma.publication.create({
        data: {
          contentId: content.id,
          channel: Channel.FACEBOOK,
          projectChannelId: channel.id,
          status: PublicationStatus.QUEUED,
          scheduledAt: await nextAvailableTime(Channel.FACEBOOK),
        },
      });
      result.pagePublished += 1;
    } else {
      await prisma.publication.create({
        data: {
          contentId: content.id,
          channel: Channel.FACEBOOK,
          projectChannelId: channel.id,
          assisted: true,
          status: PublicationStatus.QUEUED,
          scheduledAt: new Date(),
        },
      });
      result.groupsQueued += 1;
    }
  }

  return result;
}
