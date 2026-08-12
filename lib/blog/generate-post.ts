import { prisma } from "@/lib/database";
import { generateContent } from "@/lib/ai";
import { logger } from "@/lib/logging";
import { Channel, type Product } from "@/lib/generated/prisma/client";
import { toProductFacts } from "@/lib/affiliate/product-facts";
import { marketplaceLabel } from "@/lib/content/product-post";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Gera e publica automaticamente um post de blog a partir de um produto com
 * link de afiliado (docs/especificacao-automacao-produtos-chartfm.md §10/§11:
 * "publicar automaticamente no blog"). Estrutura editorial mínima
 * (introdução/produto/conclusão) em vez de só "Produto X por R$ Y".
 *
 * Idempotente: um produto só gera um BlogPost automático (verificado por
 * productId) — evita duplicar posts a cada vez que o link é reeditado.
 */
export async function generateAutoBlogPost(product: Product, trackedUrl: string) {
  const existing = await prisma.blogPost.findFirst({ where: { productId: product.id, source: { not: "MANUAL" } } });
  if (existing) return existing;

  const generated = await generateContent({
    product: toProductFacts(product),
    channel: Channel.BLOG,
    marketplace: marketplaceLabel(product.source),
    affiliateUrl: trackedUrl,
  });

  const isPromotion = (product.discountPercent ? Number(product.discountPercent) : 0) >= 20;
  const title = isPromotion
    ? `${product.name}: oferta com ${Number(product.discountPercent)}% de desconto`
    : `${product.name}: vale a pena conferir`;

  const slug = `${slugify(title)}-${product.id.slice(-6)}`;

  const priceLine = product.originalPrice
    ? `De ${formatCurrency(Number(product.originalPrice))} por **${formatCurrency(Number(product.price))}**.`
    : `Por ${formatCurrency(Number(product.price))}.`;

  const body = [
    `## ${generated.headline}`,
    "",
    generated.description,
    "",
    `${priceLine}`,
    "",
    `👉 [Confira a oferta](${trackedUrl})`,
  ].join("\n");

  const blogPost = await prisma.blogPost.create({
    data: {
      projectId: product.projectId,
      productId: product.id,
      title,
      slug,
      excerpt: generated.description.slice(0, 200),
      body,
      coverImageUrl: product.imageUrl,
      seoTitle: title,
      metaDescription: generated.description.slice(0, 160),
      status: "PUBLISHED",
      publishedAt: new Date(),
      source: `${product.source}_AUTO`,
    },
  });

  logger.info("CONTENT", "Post de blog gerado automaticamente", { productId: product.id, blogPostId: blogPost.id });

  return blogPost;
}
