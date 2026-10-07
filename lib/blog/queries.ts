import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Leitura pública dos blogs. Regras:
 * - só post PUBLISHED aparece;
 * - listagem, busca e sitemap mostram só EDITORIAL (texto próprio); fichas de produto e
 *   listas abrem pelo link direto, com noindex, para não diluir a qualidade do site.
 */
export const PUBLISHED = { status: "PUBLISHED" } satisfies Prisma.PostWhereInput;
export const LISTED = { status: "PUBLISHED", kind: "EDITORIAL" } satisfies Prisma.PostWhereInput;

export const getBlog = cache(async (subdomain: string) =>
  prisma.blog.findFirst({ where: { subdomain, active: true } }),
);

export type PublicBlog = NonNullable<Awaited<ReturnType<typeof getBlog>>>;

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  category: true,
  publishedAt: true,
  cover: { select: { url: true, alt: true } },
} satisfies Prisma.PostSelect;

export type PostCard = Prisma.PostGetPayload<{ select: typeof cardSelect }>;

export async function listPosts(blogId: string, page: number, pageSize: number) {
  const where = { blogId, ...LISTED };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: cardSelect,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);
  return { posts, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function searchPosts(blogId: string, term: string, limit = 30): Promise<PostCard[]> {
  const words = term.trim().split(/\s+/).filter((word) => word.length > 1).slice(0, 6);
  if (words.length === 0) return [];
  return prisma.post.findMany({
    where: {
      blogId,
      ...LISTED,
      AND: words.map((word) => ({
        OR: [
          { title: { contains: word, mode: "insensitive" as const } },
          { summary: { contains: word, mode: "insensitive" as const } },
          { body: { contains: word, mode: "insensitive" as const } },
        ],
      })),
    },
    select: cardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export const getPublishedPost = cache(async (blogId: string, slug: string) =>
  prisma.post.findFirst({
    where: { blogId, slug, ...PUBLISHED },
    include: {
      cover: true,
      audio: true,
      products: { orderBy: { position: "asc" }, take: 1, select: { productId: true } },
    },
  }),
);

/** "Leia também": mesma linha editorial primeiro, completando com os mais recentes. */
export async function relatedPosts(post: { id: string; blogId: string; category: string | null }, limit = 3): Promise<PostCard[]> {
  const sameCategory = post.category
    ? await prisma.post.findMany({
        where: { blogId: post.blogId, ...LISTED, category: post.category as never, id: { not: post.id } },
        select: cardSelect,
        orderBy: { publishedAt: "desc" },
        take: limit,
      })
    : [];
  if (sameCategory.length >= limit) return sameCategory;
  const others = await prisma.post.findMany({
    where: { blogId: post.blogId, ...LISTED, id: { notIn: [post.id, ...sameCategory.map((item) => item.id)] } },
    select: cardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit - sameCategory.length,
  });
  return [...sameCategory, ...others];
}

export async function sitemapPosts(blogId: string) {
  return prisma.post.findMany({
    where: { blogId, ...LISTED },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });
}
