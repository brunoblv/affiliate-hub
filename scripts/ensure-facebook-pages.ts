/**
 * Garante canais PUBLIC_PAGE do Facebook com externalPageId nos 3 projetos.
 *
 * Uso: npx tsx scripts/ensure-facebook-pages.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { getMetaTokens } from "../lib/meta/credentials";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PAGES = [
  {
    projectSlug: "umbanda",
    projectName: "Umbanda",
    channelName: "Página Universo Umbanda",
    pageId: "1612010899071169",
    pageUrl: "https://www.facebook.com/1612010899071169",
  },
  {
    projectSlug: "meu-novo-lar",
    projectName: "Meu Novo Lar",
    channelName: "Página Meu Novo Lar",
    pageId: "1312188428634291",
    pageUrl: "https://www.facebook.com/1312188428634291",
  },
  {
    projectSlug: "achadinhos-tiktok",
    projectName: "Achadinhos Tik Tok",
    channelName: "Página Achadinhos Tik Tok",
    pageId: "1303950226131311",
    pageUrl: "https://www.facebook.com/1303950226131311",
  },
] as const;

async function main() {
  const tokens = await getMetaTokens();
  const connectedIds = new Set(tokens?.pages.map((p) => p.id) ?? []);

  for (const page of PAGES) {
    const project = await prisma.affiliateProject.findUnique({ where: { slug: page.projectSlug } });
    if (!project) {
      console.warn(`Projeto ${page.projectSlug} não existe — pulando.`);
      continue;
    }

    const existing = await prisma.projectChannel.findFirst({
      where: { projectId: project.id, type: "PUBLIC_PAGE", platform: "FACEBOOK" },
    });

    if (existing) {
      await prisma.projectChannel.update({
        where: { id: existing.id },
        data: {
          name: page.channelName,
          externalPageId: page.pageId,
          url: page.pageUrl,
          active: true,
        },
      });
      console.log(`Atualizado: ${page.projectSlug} → ${page.pageId}`);
    } else {
      await prisma.projectChannel.create({
        data: {
          projectId: project.id,
          name: page.channelName,
          platform: "FACEBOOK",
          type: "PUBLIC_PAGE",
          externalPageId: page.pageId,
          url: page.pageUrl,
          allowLinks: true,
          allowOffers: true,
        },
      });
      console.log(`Criado: ${page.projectSlug} → ${page.pageId}`);
    }

    if (!connectedIds.has(page.pageId)) {
      console.warn(
        `  ⚠ Página ${page.pageId} ainda NÃO está nas credenciais Meta. Rode npm run meta:bootstrap com um user token que administre essa página.`,
      );
    } else {
      const metaName = tokens?.pages.find((p) => p.id === page.pageId)?.name;
      console.log(`  ✓ Meta conectada: ${metaName}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
