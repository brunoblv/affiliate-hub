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
      create: { name: category.name, slug: category.slug },
      update: {},
    });

    for (const childName of category.children) {
      const childSlug = `${category.slug}-${childName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")}`;

      await prisma.category.upsert({
        where: { slug: childSlug },
        create: { name: childName, slug: childSlug, parentId: parent.id },
        update: { parentId: parent.id },
      });
    }
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
