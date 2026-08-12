import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { getSiteUrl } from "@/lib/site-url";
import { getPublisher } from "@/lib/publishing";
import { Channel, ContentStatus, ContentType, ProjectChannelType, PublicationStatus } from "@/lib/generated/prisma/client";
import {
  TELEGRAM_GROUP_LINK,
  TELEGRAM_TIKTOK_SHOP_GROUP_LINK,
  WHATSAPP_GROUP_LINK,
  WHATSAPP_TIKTOK_SHOP_GROUP_LINK,
} from "@/lib/content/product-post";

interface GroupInvitePageConfig {
  projectSlug: string;
  /** Caminho em /public — usado como foto do post (é a própria foto de perfil da página). */
  imagePath: string;
  title: string;
  description: string;
}

const PAGES: GroupInvitePageConfig[] = [
  {
    projectSlug: "meu-novo-lar",
    imagePath: "/geral.png",
    title: "📢 Você já está no nosso grupo?",
    description: [
      "Receba os melhores achadinhos e promoções em primeira mão, direto no seu Telegram ou WhatsApp!",
      "",
      `🔵 Telegram: ${TELEGRAM_GROUP_LINK}`,
      `🟢 WhatsApp: ${WHATSAPP_GROUP_LINK}`,
      "",
      "Entre agora e não perca nenhuma oferta! 🛒🔥",
    ].join("\n"),
  },
  {
    projectSlug: "achadinhos-tiktok",
    imagePath: "/tiktok.png",
    title: "📢 Ama TikTok Shop? Vem pro grupo!",
    description: [
      "Ofertas exclusivas do TikTok Shop, todo dia, direto no seu Telegram ou WhatsApp!",
      "",
      `🔵 Telegram: ${TELEGRAM_TIKTOK_SHOP_GROUP_LINK}`,
      `🟢 WhatsApp: ${WHATSAPP_TIKTOK_SHOP_GROUP_LINK}`,
      "",
      "Entra agora! 🎥🛍️",
    ].join("\n"),
  },
];

const INTERVAL_DAYS = 7;

function settingKey(projectSlug: string): string {
  return `groupInvitePost:${projectSlug}:lastRunAt`;
}

async function shouldRun(projectSlug: string): Promise<boolean> {
  const setting = await prisma.setting.findUnique({ where: { key: settingKey(projectSlug) } });
  const lastRunAt = (setting?.value as { lastRunAt?: string } | undefined)?.lastRunAt;
  if (!lastRunAt) return true;
  const elapsedDays = (Date.now() - new Date(lastRunAt).getTime()) / (24 * 60 * 60 * 1000);
  return elapsedDays >= INTERVAL_DAYS;
}

async function markRun(projectSlug: string): Promise<void> {
  const value = { lastRunAt: new Date().toISOString() };
  await prisma.setting.upsert({
    where: { key: settingKey(projectSlug) },
    create: { key: settingKey(projectSlug), value },
    update: { value },
  });
}

/**
 * Publica periodicamente (a cada INTERVAL_DAYS, checado pelo schedulerTick) um
 * post convidando pros grupos de Telegram/WhatsApp na Página do Facebook de
 * cada projeto — não é atrelado a nenhum produto, então usa a própria foto de
 * perfil da página (public/geral.png, public/tiktok.png) como imagem.
 */
export async function maybeRunGroupInvitePosts(): Promise<void> {
  for (const page of PAGES) {
    if (!(await shouldRun(page.projectSlug))) continue;

    const project = await prisma.affiliateProject.findUnique({ where: { slug: page.projectSlug } });
    if (!project) continue;

    const projectChannel = await prisma.projectChannel.findFirst({
      where: { projectId: project.id, active: true, platform: Channel.FACEBOOK, type: ProjectChannelType.PUBLIC_PAGE },
    });

    if (!projectChannel?.externalPageId) {
      logger.warn("PUBLISH", "Post de convite pro grupo pulado — Página do Facebook sem externalPageId", {
        projectSlug: page.projectSlug,
      });
      continue;
    }

    const imageUrl = `${getSiteUrl()}${page.imagePath}`;

    const content = await prisma.content.create({
      data: {
        projectId: project.id,
        type: ContentType.FACEBOOK_POST,
        title: page.title,
        description: page.description,
        imageUrl,
        status: ContentStatus.APPROVED,
      },
    });

    const publication = await prisma.publication.create({
      data: {
        contentId: content.id,
        channel: Channel.FACEBOOK,
        projectChannelId: projectChannel.id,
        status: PublicationStatus.PUBLISHING,
        scheduledAt: new Date(),
        attempts: 1,
      },
    });

    try {
      const publisher = getPublisher(Channel.FACEBOOK, { pageId: projectChannel.externalPageId });
      const result = await publisher.publish(content);

      await prisma.publication.update({
        where: { id: publication.id },
        data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date(), externalPostId: result.externalPostId },
      });
      await prisma.projectChannel.update({ where: { id: projectChannel.id }, data: { lastPublishedAt: new Date() } });
      await markRun(page.projectSlug);

      logger.info("PUBLISH", "Post de convite pro grupo publicado", { projectSlug: page.projectSlug });
    } catch (error) {
      await prisma.publication.update({
        where: { id: publication.id },
        data: { status: PublicationStatus.FAILED, error: error instanceof Error ? error.message : String(error) },
      });
      logger.error("PUBLISH", "Falha ao publicar convite pro grupo", { projectSlug: page.projectSlug, error });
    }
  }
}
