import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const passwordHash = await hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Admin", role: "ADMIN", passwordHash },
    update: { passwordHash },
  });

  // Projetos de afiliados (docs/modulo-afiliados-umbanda.md) — cada projeto isola
  // categorias, produtos, campanhas, canais e conteúdo, compartilhando o mesmo motor.
  const homeProject = await prisma.affiliateProject.upsert({
    where: { slug: "meu-novo-lar" },
    create: {
      name: "Meu Novo Lar",
      slug: "meu-novo-lar",
      type: "HOME",
      description: "Produtos de casa, reforma e organização.",
    },
    update: {},
  });

  const umbandaProject = await prisma.affiliateProject.upsert({
    where: { slug: "umbanda" },
    create: {
      name: "Umbanda",
      slug: "umbanda",
      type: "UMBANDA",
      description: "Produtos relacionados à Umbanda e espiritualidade.",
    },
    update: {},
  });

  // docs/especificacao-automacao-produtos-chartfm.md — vinis e artigos de música,
  // com destino futuro à Loja do ChartFM (integração ainda não implementada).
  const chartfmProject = await prisma.affiliateProject.upsert({
    where: { slug: "chartfm" },
    create: {
      name: "ChartFM",
      slug: "chartfm",
      type: "MUSICA",
      description: "Vinis, CDs e artigos de música — candidatos à Loja do ChartFM.",
    },
    update: {},
  });

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-");

  // Taxonomia inicial (spec §7) — definitiva será revista junto do blog.
  const taxonomy = [
    {
      name: "Casa",
      slug: "casa",
      children: ["Cozinha", "Organização", "Limpeza", "Decoração", "Iluminação", "Eletrodomésticos"],
    },
    {
      name: "Dia a Dia",
      slug: "dia-a-dia",
      children: ["Acessórios", "Utilidades", "Escritório", "Ferramentas", "Cuidados pessoais"],
    },
  ];

  for (const category of taxonomy) {
    const parent = await prisma.category.upsert({
      where: { slug: category.slug },
      create: { name: category.name, slug: category.slug, projectId: homeProject.id },
      update: {},
    });

    for (const childName of category.children) {
      const childSlug = `${category.slug}-${slugify(childName)}`;

      await prisma.category.upsert({
        where: { slug: childSlug },
        create: { name: childName, slug: childSlug, parentId: parent.id, projectId: homeProject.id },
        update: { parentId: parent.id },
      });
    }
  }

  // Categorias do projeto Umbanda (docs/modulo-afiliados-umbanda.md §Categorias).
  const umbandaCategories = [
    "Velas e iluminação",
    "Defumação",
    "Artigos religiosos",
    "Guias e acessórios",
    "Vestuário",
    "Livros",
    "Baralhos e oráculos",
    "Decoração",
  ];

  for (const name of umbandaCategories) {
    const slug = `umbanda-${slugify(name)}`;
    await prisma.category.upsert({
      where: { slug },
      create: { name, slug, projectId: umbandaProject.id },
      update: {},
    });
  }

  // Categorias do projeto ChartFM (docs/especificacao-automacao-produtos-chartfm.md §31).
  const chartfmCategories = [
    "Vinis",
    "CDs",
    "Fones",
    "Caixas de som",
    "Livros de música",
    "Microfones",
    "Instrumentos",
    "Acessórios",
  ];

  for (const name of chartfmCategories) {
    const slug = `chartfm-${slugify(name)}`;
    await prisma.category.upsert({
      where: { slug },
      create: { name, slug, projectId: chartfmProject.id },
      update: {},
    });
  }

  // Campanhas iniciais do projeto Umbanda (docs/modulo-afiliados-umbanda.md §Campanhas).
  const umbandaCampaigns = [
    { code: "UMB-FACEBOOK", name: "Página Facebook", channel: "FACEBOOK" },
    { code: "UMB-PAGINA", name: "Conteúdo da página", channel: "FACEBOOK" },
    { code: "UMB-GRUPO", name: "Grupos públicos", channel: "FACEBOOK" },
    { code: "UMB-VELAS", name: "Velas e iluminação", channel: "FACEBOOK" },
    { code: "UMB-LIVROS", name: "Livros de Umbanda", channel: "FACEBOOK" },
    { code: "UMB-ORIXAS", name: "Orixás", channel: "FACEBOOK" },
    { code: "UMB-GUIAS", name: "Guias e acessórios", channel: "FACEBOOK" },
  ];

  for (const campaign of umbandaCampaigns) {
    await prisma.campaign.upsert({
      where: { projectId_code: { projectId: umbandaProject.id, code: campaign.code } },
      create: {
        projectId: umbandaProject.id,
        name: campaign.name,
        code: campaign.code,
        channel: campaign.channel,
        status: "DRAFT",
      },
      update: {},
    });
  }

  // Templates padrão por canal (spec §15) — reutilizáveis, editáveis em /admin/templates.
  const templates = [
    {
      name: "Post padrão Facebook",
      channel: "FACEBOOK" as const,
      type: "FACEBOOK_POST" as const,
      template: "🔥 {{headline}}\n\n{{description}}\n\n💰 De {{oldPrice}}\n🔥 Por {{price}}\n\n⭐ {{rating}}\n\n👉 {{cta}}",
    },
    {
      name: "Post padrão Instagram",
      channel: "INSTAGRAM" as const,
      type: "INSTAGRAM_POST" as const,
      template: "{{headline}} ✨\n\n{{description}}\n\n{{cta}}\n\n{{hashtags}}",
    },
    {
      name: "Vídeo padrão TikTok",
      channel: "TIKTOK" as const,
      type: "TIKTOK_VIDEO" as const,
      template: "{{headline}} 🔥 {{cta}}\n{{hashtags}}",
    },
    {
      name: "Post padrão Telegram",
      channel: "TELEGRAM" as const,
      type: "TELEGRAM_POST" as const,
      template: "🔥 {{headline}}\n\n{{description}}\n\n👉 {{cta}}",
    },
    {
      name: "Artigo padrão Blog",
      channel: "BLOG" as const,
      type: "BLOG_ARTICLE" as const,
      template: "# {{headline}}\n\n{{description}}\n\n## Onde comprar\n\n{{cta}}",
    },
  ];

  for (const template of templates) {
    const existing = await prisma.contentTemplate.findFirst({ where: { name: template.name } });
    if (!existing) {
      await prisma.contentTemplate.create({ data: template });
    }
  }

  console.log(`Usuário admin pronto: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
