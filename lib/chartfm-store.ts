import { prisma } from "@/lib/database";
import type { Platform } from "@/lib/generated/prisma/client";

/** Slug do AffiliateProject que alimenta a Loja do ChartFM. */
export const CHARTFM_PROJECT_SLUG = "chartfm";

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

export type ChartfmStoreProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number;
  platform: Platform;
  categoryName: string | null;
  categorySlug: string | null;
  /** Link de afiliado resolvido. Sem afiliado o item não entra na lista. */
  goUrl: string;
};

export type ChartfmStoreCategory = {
  slug: string;
  name: string;
  count: number;
};

export type ChartfmStoreListing = {
  project: string;
  products: ChartfmStoreProduct[];
  categories: ChartfmStoreCategory[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type ChartfmStoreGoTarget = {
  url: string;
  platform: Platform;
  categorySlug: string | null;
};

function toNumber(value: { toNumber(): number } | null | undefined): number | null {
  return value ? value.toNumber() : null;
}

/**
 * Só link de afiliado. Nunca cai no productUrl/externalUrl normal:
 * a Loja do ChartFM precisa monetizar o clique.
 *
 * Ordem: ProductSource da mesma plataforma → qualquer ProductSource →
 * AffiliateLink da mesma plataforma → qualquer AffiliateLink.
 */
export function resolveChartfmGoUrl(
  platform: Platform,
  sources: { platform: Platform; affiliateUrl: string | null }[],
  affiliateLinks: { platform: Platform; affiliateUrl: string }[] = [],
): string | null {
  const sameSource = sources.find((s) => s.platform === platform && s.affiliateUrl);
  if (sameSource?.affiliateUrl) return sameSource.affiliateUrl;
  const anySource = sources.find((s) => s.affiliateUrl);
  if (anySource?.affiliateUrl) return anySource.affiliateUrl;

  const sameLink = affiliateLinks.find((l) => l.platform === platform && l.affiliateUrl);
  if (sameLink?.affiliateUrl) return sameLink.affiliateUrl;
  const anyLink = affiliateLinks.find((l) => l.affiliateUrl);
  if (anyLink?.affiliateUrl) return anyLink.affiliateUrl;

  return null;
}

export function clampPageSize(raw: number | undefined): number {
  if (!raw || !Number.isFinite(raw)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(raw)));
}

export function clampPage(raw: number | undefined, pageCount: number): number {
  const page = raw && Number.isFinite(raw) ? Math.floor(raw) : 1;
  return Math.min(Math.max(1, page), Math.max(1, pageCount));
}

/** Catálogo ACTIVE do projeto `chartfm`, no shape que a Loja do ChartFM já espera. */
export async function getChartfmStoreListing(options: {
  categorySlug?: string;
  page?: number;
  pageSize?: number;
}): Promise<ChartfmStoreListing | null> {
  const pageSize = clampPageSize(options.pageSize);

  const project = await prisma.affiliateProject.findFirst({
    where: { slug: CHARTFM_PROJECT_SLUG, active: true },
    select: { id: true },
  });
  if (!project) return null;

  const categories = await prisma.category.findMany({
    where: {
      projectId: project.id,
      active: true,
      products: {
        some: {
          status: "ACTIVE",
          OR: [
            { sources: { some: { affiliateUrl: { not: null } } } },
            { affiliateLinks: { some: {} } },
          ],
        },
      },
    },
    select: {
      slug: true,
      name: true,
      _count: {
        select: {
          products: {
            where: {
              status: "ACTIVE",
              OR: [
                { sources: { some: { affiliateUrl: { not: null } } } },
                { affiliateLinks: { some: {} } },
              ],
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const categoryFilter = options.categorySlug
    ? await prisma.category.findFirst({
        where: { slug: options.categorySlug, projectId: project.id, active: true },
        select: { id: true },
      })
    : null;

  // Categoria pedida que não pertence ao ChartFM: lista vazia, não o catálogo inteiro.
  if (options.categorySlug && !categoryFilter) {
    return {
      project: CHARTFM_PROJECT_SLUG,
      products: [],
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        count: c._count.products,
      })),
      total: 0,
      page: 1,
      pageCount: 0,
      pageSize,
    };
  }

  const where = {
    projectId: project.id,
    status: "ACTIVE" as const,
    ...(categoryFilter ? { categoryId: categoryFilter.id } : {}),
    // Sem afiliado a Loja não lista: clique sem comissão não entra no catálogo.
    OR: [
      { sources: { some: { affiliateUrl: { not: null } } } },
      { affiliateLinks: { some: {} } },
    ],
  };

  const total = await prisma.product.count({ where });
  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);
  const page = clampPage(options.page, pageCount || 1);

  const rows = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      imageUrl: true,
      price: true,
      originalPrice: true,
      discountPercent: true,
      currency: true,
      rating: true,
      reviewCount: true,
      source: true,
      category: { select: { name: true, slug: true } },
      sources: { select: { platform: true, affiliateUrl: true } },
      affiliateLinks: {
        select: { platform: true, affiliateUrl: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ discountPercent: "desc" }, { createdAt: "desc" }],
    skip: total === 0 ? 0 : (page - 1) * pageSize,
    take: pageSize,
  });

  const products: ChartfmStoreProduct[] = [];
  for (const row of rows) {
    const goUrl = resolveChartfmGoUrl(row.source, row.sources, row.affiliateLinks);
    if (!goUrl) continue;
    products.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      brand: row.brand,
      imageUrl: row.imageUrl,
      price: row.price.toNumber(),
      originalPrice: toNumber(row.originalPrice),
      discountPercent: toNumber(row.discountPercent),
      currency: row.currency,
      rating: toNumber(row.rating),
      reviewCount: row.reviewCount ?? 0,
      platform: row.source,
      categoryName: row.category?.name ?? null,
      categorySlug: row.category?.slug ?? null,
      goUrl,
    });
  }

  return {
    project: CHARTFM_PROJECT_SLUG,
    products,
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      count: c._count.products,
    })),
    total,
    page,
    pageCount,
    pageSize,
  };
}

/** Resolve o destino de compra de um produto ACTIVE do projeto chartfm. */
export async function getChartfmStoreGoTarget(productId: string): Promise<ChartfmStoreGoTarget | null> {
  const row = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "ACTIVE",
      project: { slug: CHARTFM_PROJECT_SLUG, active: true },
    },
    select: {
      source: true,
      category: { select: { slug: true } },
      sources: { select: { platform: true, affiliateUrl: true } },
      affiliateLinks: {
        select: { platform: true, affiliateUrl: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!row) return null;

  const url = resolveChartfmGoUrl(row.source, row.sources, row.affiliateLinks);
  if (!url) return null;

  return {
    url,
    platform: row.source,
    categorySlug: row.category?.slug ?? null,
  };
}
