/**
 * Garante canais de publicação por projeto:
 * - Páginas do Facebook (Umbanda, Meu Novo Lar, Achadinhos, ChartFM)
 * - Telegram/WhatsApp do Meu Novo Lar também no projeto de beleza coreana
 *
 * Uso:
 *   npx tsx scripts/ensure-facebook-pages.ts
 *   npx tsx scripts/ensure-facebook-pages.ts --prod
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Channel, type ProjectChannelType } from "../lib/generated/prisma/client";

const PAGES = [
  {
    projectSlug: "umbanda",
    channelName: "Página Universo Umbanda",
    pageId: "1612010899071169",
    pageUrl: "https://www.facebook.com/1612010899071169",
    cooldownDays: 7,
  },
  {
    projectSlug: "meu-novo-lar",
    channelName: "Página Meu Novo Lar",
    pageId: "1312188428634291",
    pageUrl: "https://www.facebook.com/1312188428634291",
    cooldownDays: 7,
  },
  {
    projectSlug: "achadinhos-tiktok",
    channelName: "Página Achadinhos Tik Tok",
    pageId: "1303950226131311",
    pageUrl: "https://www.facebook.com/1303950226131311",
    cooldownDays: 3,
  },
  {
    projectSlug: "chartfm",
    channelName: "Página ChartFM",
    pageId: "101036418391156",
    pageUrl: "https://www.facebook.com/101036418391156",
    cooldownDays: 7,
  },
] as const;

const SHARED_GROUPS = [
  {
    fromSlug: "meu-novo-lar",
    toSlug: "produtos-de-beleza-coreanos",
    platforms: ["TELEGRAM", "WHATSAPP"] as const,
  },
] as const;

function connectionString(): string {
  const useProd = process.argv.includes("--prod");
  const url = useProd ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(useProd ? "PROD_DATABASE_URL não está definido." : "DATABASE_URL não está definido.");
  }
  return url;
}

async function upsertFacebookPage(
  prisma: PrismaClient,
  page: (typeof PAGES)[number],
  connectedIds: Set<string>,
) {
  const project = await prisma.affiliateProject.findUnique({ where: { slug: page.projectSlug } });
  if (!project) {
    console.warn(`Projeto ${page.projectSlug} não existe — pulando Página Facebook.`);
    return;
  }

  const existing = await prisma.projectChannel.findFirst({
    where: { projectId: project.id, type: "PUBLIC_PAGE", platform: "FACEBOOK" },
  });

  const data = {
    name: page.channelName,
    externalPageId: page.pageId,
    url: page.pageUrl,
    cooldownDays: page.cooldownDays,
    active: true,
    allowLinks: true,
    allowOffers: true,
  };

  if (existing) {
    await prisma.projectChannel.update({ where: { id: existing.id }, data });
    console.log(`Atualizado: ${page.projectSlug} → ${page.pageId}`);
  } else {
    await prisma.projectChannel.create({
      data: {
        projectId: project.id,
        platform: "FACEBOOK",
        type: "PUBLIC_PAGE",
        ...data,
      },
    });
    console.log(`Criado: ${page.projectSlug} → ${page.pageId}`);
  }

  if (!connectedIds.has(page.pageId)) {
    console.warn(
      `  ⚠ Página ${page.pageId} ainda sem Page Access Token em meta_facebook_pages.`,
    );
  }
}

async function cloneGroupChannels(
  prisma: PrismaClient,
  fromSlug: string,
  toSlug: string,
  platform: Channel,
) {
  const from = await prisma.affiliateProject.findUnique({ where: { slug: fromSlug } });
  const to = await prisma.affiliateProject.findUnique({ where: { slug: toSlug } });
  if (!from || !to) {
    console.warn(`Projeto ${from ? toSlug : fromSlug} não existe — pulando clone ${platform}.`);
    return;
  }

  const source = await prisma.projectChannel.findFirst({
    where: { projectId: from.id, platform, active: true, externalChatId: { not: null } },
  });
  if (!source?.externalChatId) {
    console.warn(`Canal ${platform} de ${fromSlug} sem externalChatId — pulando clone.`);
    return;
  }

  const existing = await prisma.projectChannel.findFirst({
    where: { projectId: to.id, platform },
  });

  const data = {
    name: source.name,
    type: source.type as ProjectChannelType,
    url: source.url,
    externalChatId: source.externalChatId,
    notes: `Mesmo grupo do projeto ${from.name}.`,
    cooldownDays: source.cooldownDays,
    allowLinks: source.allowLinks,
    allowOffers: source.allowOffers,
    active: true,
  };

  if (existing) {
    await prisma.projectChannel.update({ where: { id: existing.id }, data });
    console.log(`Atualizado: ${toSlug} ${platform} → ${source.externalChatId}`);
  } else {
    await prisma.projectChannel.create({
      data: {
        projectId: to.id,
        platform,
        ...data,
      },
    });
    console.log(`Criado: ${toSlug} ${platform} → ${source.externalChatId}`);
  }
}

async function main() {
  const url = connectionString();
  const host = url.replace(/:[^:@]+@/, ":***@").replace(/\?.*$/, "");
  console.log("banco:", host);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const connected = await prisma.metaFacebookPage.findMany({
      where: { active: true },
      select: { pageId: true, name: true },
    });
    const connectedIds = new Set(connected.map((p) => p.pageId));

    for (const page of PAGES) {
      await upsertFacebookPage(prisma, page, connectedIds);
    }

    for (const share of SHARED_GROUPS) {
      for (const platform of share.platforms) {
        await cloneGroupChannels(prisma, share.fromSlug, share.toSlug, platform);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
