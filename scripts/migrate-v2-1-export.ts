/**
 * Passo 1/2 da migração pro schema v2 (docs/hub/especificacao-affiliate-hub-v2.md).
 *
 * Lê as tabelas do schema ANTIGO via SQL puro (não usa o Prisma Client
 * gerado, que já reflete o schema NOVO) e grava um snapshot em JSON. Roda
 * ANTES de aplicar o schema novo no banco (antes de `prisma migrate` /
 * `prisma db push`) — as tabelas antigas (products, blog_posts,
 * affiliate_links, project_channels, newsletter_subscribers) ainda existem.
 *
 * Produtos sem nenhum affiliate_link cadastrado são pulados e listados no
 * final: a regra do AGENTS.md proíbe inventar link de afiliado, e o schema
 * novo exige Produto.linkAfiliado — não tem como migrar esses sem intervenção
 * manual (cadastrar o link certo depois, direto na tela de admin).
 *
 * Uso:
 *   npx tsx scripts/migrate-v2-1-export.ts
 *
 * Gera scripts/.migration-snapshot.json — passo 2 é migrate-v2-2-import.ts.
 */
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface ProductRow {
  id: string;
  source: string;
  externalId: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  originalPrice: string | null;
  status: string;
  createdAt: Date;
}

interface AffiliateLinkRow {
  id: string;
  productId: string;
  channel: string;
  affiliateUrl: string;
  shortCode: string;
  createdAt: Date;
}

interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  status: string;
  publishedAt: Date | null;
  productId: string | null;
}

interface BlogPostProductRow {
  id: string;
  blogPostId: string;
  productId: string;
  order: number;
  label: string | null;
  note: string | null;
}

interface ProjectChannelRow {
  id: string;
  name: string;
  platform: string;
  type: string;
  active: boolean;
  externalPageId: string | null;
  externalChatId: string | null;
  cooldownDays: number;
}

interface NewsletterSubscriberRow {
  id: string;
  email: string;
  status: string;
  unsubscribeToken: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
}

async function main() {
  const products = await prisma.$queryRawUnsafe<ProductRow[]>(`
    SELECT id, source, "externalId", slug, name, description, "imageUrl", price::text, "originalPrice"::text, status, "createdAt"
    FROM products
  `);

  const affiliateLinks = await prisma.$queryRawUnsafe<AffiliateLinkRow[]>(`
    SELECT id, "productId", channel, "affiliateUrl", "shortCode", "createdAt"
    FROM affiliate_links
    ORDER BY "createdAt" DESC
  `);

  const blogPosts = await prisma.$queryRawUnsafe<BlogPostRow[]>(`
    SELECT id, title, slug, excerpt, body, "coverImageUrl", "seoTitle", "metaDescription", status, "publishedAt", "productId"
    FROM blog_posts
  `);

  const blogPostProducts = await prisma.$queryRawUnsafe<BlogPostProductRow[]>(`
    SELECT id, "blogPostId", "productId", "order", label, note
    FROM blog_post_products
    ORDER BY "blogPostId", "order" ASC
  `);

  const projectChannels = await prisma.$queryRawUnsafe<ProjectChannelRow[]>(`
    SELECT id, name, platform, type, active, "externalPageId", "externalChatId", "cooldownDays"
    FROM project_channels
    WHERE platform IN ('FACEBOOK', 'INSTAGRAM', 'TELEGRAM') AND active = true
  `);

  const newsletterSubscribers = await prisma.$queryRawUnsafe<NewsletterSubscriberRow[]>(`
    SELECT id, email, status, "unsubscribeToken", "subscribedAt", "unsubscribedAt"
    FROM newsletter_subscribers
  `);

  const linksByProduct = new Map<string, AffiliateLinkRow[]>();
  for (const link of affiliateLinks) {
    const lista = linksByProduct.get(link.productId) ?? [];
    lista.push(link);
    linksByProduct.set(link.productId, lista);
  }

  const semLink = products.filter((p) => !linksByProduct.has(p.id));

  const snapshot = {
    geradoEm: new Date().toISOString(),
    products,
    affiliateLinks,
    blogPosts,
    blogPostProducts,
    projectChannels,
    newsletterSubscribers,
  };

  const destino = path.join(__dirname, ".migration-snapshot.json");
  await writeFile(destino, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(`Snapshot salvo em ${destino}`);
  console.log(`  products: ${products.length}`);
  console.log(`  affiliateLinks: ${affiliateLinks.length}`);
  console.log(`  blogPosts: ${blogPosts.length}`);
  console.log(`  blogPostProducts: ${blogPostProducts.length}`);
  console.log(`  projectChannels (FB/IG/Telegram ativos): ${projectChannels.length}`);
  console.log(`  newsletterSubscribers: ${newsletterSubscribers.length}`);

  if (semLink.length > 0) {
    console.log(`\n${semLink.length} produto(s) SEM affiliate_link — não serão migrados (AGENTS.md: nunca link cru):`);
    for (const p of semLink) console.log(`  - [${p.id}] ${p.name}`);
  }

  console.log(
    "\nPróximo passo: aplique o schema novo no banco (npx prisma migrate dev, ou db push em dev) e depois rode " +
      "npx tsx scripts/migrate-v2-2-import.ts",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
