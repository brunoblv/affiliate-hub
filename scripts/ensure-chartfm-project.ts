/**
 * Garante o projeto ChartFM + categorias no banco apontado por DATABASE_URL.
 * Idempotente. Útil em produção quando o seed completo ainda não rodou
 * (Prisma v7 não auto-roda seed no migrate).
 *
 * Uso (na pasta Sistema-afiliados):
 *   npx tsx scripts/ensure-chartfm-project.ts
 *
 * Conferir a porta antes: local é 5432 (affiliate-manager-postgres).
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
  "Vinis",
  "CDs",
  "Fones",
  "Caixas de som",
  "Livros de música",
  "Microfones",
  "Instrumentos",
  "Acessórios",
];

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.replace(/:[^:@]+@/, ":***@").replace(/\?.*$/, "");
  console.log("banco:", host || "(DATABASE_URL vazia)");

  const project = await prisma.affiliateProject.upsert({
    where: { slug: "chartfm" },
    create: {
      name: "ChartFM",
      slug: "chartfm",
      type: "MUSICA",
      description: "Vinis, CDs e artigos de música — candidatos à Loja do ChartFM.",
    },
    update: { active: true },
  });
  console.log("projeto:", project.id, project.slug);

  for (const name of CATEGORIES) {
    const slug = `chartfm-${slugify(name)}`;
    await prisma.category.upsert({
      where: { slug },
      create: { name, slug, projectId: project.id },
      update: { projectId: project.id, active: true },
    });
  }
  console.log(`categorias: ${CATEGORIES.length} garantidas`);

  const existingPage = await prisma.projectChannel.findFirst({
    where: { projectId: project.id, type: "PUBLIC_PAGE", platform: "FACEBOOK" },
  });
  const pageData = {
    name: "Página ChartFM",
    externalPageId: "101036418391156",
    url: "https://www.facebook.com/101036418391156",
    active: true,
    allowLinks: true,
    allowOffers: true,
    cooldownDays: 7,
  };
  if (existingPage) {
    await prisma.projectChannel.update({ where: { id: existingPage.id }, data: pageData });
    console.log("canal: Página Facebook atualizada");
  } else {
    await prisma.projectChannel.create({
      data: {
        projectId: project.id,
        platform: "FACEBOOK",
        type: "PUBLIC_PAGE",
        ...pageData,
      },
    });
    console.log("canal: Página Facebook criada");
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
