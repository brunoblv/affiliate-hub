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
  /** Link de compra resolvido (afiliado ou productUrl). Sem link o item não entra na lista. */
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
 * Prioriza o link de afiliado da mesma plataforma do produto; sem isso, o
 * primeiro que existir; sem nenhum, cai no link direto do produto.
 */
export function resolveChartfmGoUrl(
  productUrl: string | null,
  platform: Platform,
  sources: { platform: Platform; affiliateUrl: string | null }[],
): string | null {
  const sameSource = sources.find((s) => s.platform === platform && s.affiliateUrl);
  if (sameSource?.affiliateUrl) return sameSource.affiliateUrl;
  const anySource = sources.find((s) => s.affiliateUrl);
  if (anySource?.affiliateUrl) return anySource.affiliateUrl;
  return productUrl ?? null;
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
      products: { some: { status: "ACTIVE" } },
    },
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
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
      productUrl: true,
      price: true,
      originalPrice: true,
      discountPercent: true,
      currency: true,
      rating: true,
      reviewCount: true,
      source: true,
      category: { select: { name: true, slug: true } },
      sources: { select: { platform: true, affiliateUrl: true } },
    },
    orderBy: [{ discountPercent: "desc" }, { createdAt: "desc" }],
    skip: total === 0 ? 0 : (page - 1) * pageSize,
    take: pageSize,
  });

  const products: ChartfmStoreProduct[] = [];
  for (const row of rows) {
    const goUrl = resolveChartfmGoUrl(row.productUrl, row.source, row.sources);
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
      productUrl: true,
      source: true,
      category: { select: { slug: true } },
      sources: { select: { platform: true, affiliateUrl: true } },
    },
  });
  if (!row) return null;

  const url = resolveChartfmGoUrl(row.productUrl, row.source, row.sources);
  if (!url) return null;

  return {
    url,
    platform: row.source,
    categorySlug: row.category?.slug ?? null,
  };
}
