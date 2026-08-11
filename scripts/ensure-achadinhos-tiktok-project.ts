/**
 * Garante o projeto Achadinhos Tik Tok + categorias, campanhas e canais
 * (página + grupo placeholder) no banco apontado por DATABASE_URL.
 * Idempotente. Útil quando o seed completo ainda não rodou.
 *
 * Uso (na pasta Sistema-afiliados):
 *   npx tsx scripts/ensure-achadinhos-tiktok-project.ts
 *   npm run db:ensure-achadinhos
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

const CATEGORIES = [
  "Beleza e cuidados",
  "Casa e organização",
  "Cozinha",
  "Eletrônicos e gadgets",
  "Moda e acessórios",
  "Pet",
  "Infantil",
  "Fitness e saúde",
  "Utilidades",
  "Ofertas do dia",
];

const CAMPAIGNS = [
  { code: "ACH-FACEBOOK", name: "Página Facebook", channel: "FACEBOOK" as const },
  { code: "ACH-GRUPO", name: "Grupo público", channel: "FACEBOOK" as const },
  { code: "ACH-OFERTAS", name: "Ofertas do dia", channel: "FACEBOOK" as const },
  { code: "ACH-VIRAL", name: "Produtos virais", channel: "FACEBOOK" as const },
];

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.replace(/:[^:@]+@/, ":***@").replace(/\?.*$/, "");
  console.log("banco:", host || "(DATABASE_URL vazia)");

  const project = await prisma.affiliateProject.upsert({
    where: { slug: "achadinhos-tiktok" },
    create: {
      name: "Achadinhos Tik Tok",
      slug: "achadinhos-tiktok",
      type: "ACHADINHOS",
      description: "Ofertas e achadinhos exclusivos do TikTok Shop — página e grupo dedicados.",
    },
    update: {
      active: true,
      name: "Achadinhos Tik Tok",
      description: "Ofertas e achadinhos exclusivos do TikTok Shop — página e grupo dedicados.",
    },
  });
  console.log("projeto:", project.id, project.slug);

  for (const name of CATEGORIES) {
    const slug = `achadinhos-tiktok-${slugify(name)}`;
    await prisma.category.upsert({
      where: { slug },
      create: { name, slug, projectId: project.id },
      update: { projectId: project.id, active: true },
    });
  }
  console.log(`categorias: ${CATEGORIES.length} garantidas`);

  for (const campaign of CAMPAIGNS) {
    await prisma.campaign.upsert({
      where: { projectId_code: { projectId: project.id, code: campaign.code } },
      create: {
        projectId: project.id,
        name: campaign.name,
        code: campaign.code,
        channel: campaign.channel,
        status: "DRAFT",
      },
      update: {},
    });
  }
  console.log(`campanhas: ${CAMPAIGNS.length} garantidas`);

  const existingPage = await prisma.projectChannel.findFirst({
    where: { projectId: project.id, type: "PUBLIC_PAGE", platform: "FACEBOOK" },
  });
  if (!existingPage) {
    await prisma.projectChannel.create({
      data: {
        projectId: project.id,
        name: "Página Achadinhos Tik Tok",
        platform: "FACEBOOK",
        type: "PUBLIC_PAGE",
        notes: "Preencha o ID da Página (Graph API) para publicar automaticamente.",
        cooldownDays: 3,
        allowLinks: true,
        allowOffers: true,
      },
    });
    console.log("canal: Página Facebook criada (preencher externalPageId)");
  } else {
    console.log("canal: Página Facebook já existe");
  }

  const existingGroup = await prisma.projectChannel.findFirst({
    where: { projectId: project.id, type: "PUBLIC_GROUP", platform: "FACEBOOK" },
  });
  if (!existingGroup) {
    await prisma.projectChannel.create({
      data: {
        projectId: project.id,
        name: "Grupo Achadinhos Tik Tok",
        platform: "FACEBOOK",
        type: "PUBLIC_GROUP",
        notes: "Fluxo assistido: copie o post na Central de Grupos. Preencha a URL do grupo.",
        cooldownDays: 7,
        allowLinks: true,
        allowOffers: true,
      },
    });
    console.log("canal: Grupo Facebook criado (preencher URL)");
  } else {
    console.log("canal: Grupo Facebook já existe");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
