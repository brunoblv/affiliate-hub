import type { MetadataRoute } from "next";
import { listSitemapEntries } from "@/lib/catalog";
import { institutionalLinks } from "@/lib/institutional";
import { guides } from "@/lib/guides";
import { MIN_INDEXABLE_PRODUCTS, listStoreIndex } from "@/lib/showcase/read";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Só páginas publicadas e úteis: institucionais, produtos com oferta atual e nichos ativos. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products, niches }, stores] = await Promise.all([listSitemapEntries(), listStoreIndex()]);
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/ofertas` },
    { url: `${SITE_URL}/loja` },
    { url: `${SITE_URL}/marcas` },
    { url: `${SITE_URL}/achadinhos` },
    // Vitrine com menos de 12 produtos elegíveis é noindex: não entra no sitemap.
    ...stores
      .filter((store) => store.productCount >= MIN_INDEXABLE_PRODUCTS)
      .map((store) => ({ url: `${SITE_URL}/loja/${store.slug}` })),
    ...institutionalLinks.map((link) => ({ url: `${SITE_URL}${link.href}` })),
    { url: `${SITE_URL}/guias` },
    ...guides.map((guide) => ({ url: `${SITE_URL}/guias/${guide.slug}`, lastModified: guide.updatedAt })),
    ...niches.map((niche) => ({
      url: `${SITE_URL}/categoria/${niche.slug}`,
      lastModified: niche.updatedAt,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/produto/${product.slug}`,
      lastModified: product.updatedAt,
    })),
  ];
}
