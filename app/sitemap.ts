import type { MetadataRoute } from "next";
import { listSitemapEntries } from "@/lib/catalog";
import { institutionalLinks } from "@/lib/institutional";
import { guides } from "@/lib/guides";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Só páginas publicadas e úteis: institucionais, produtos com oferta atual e nichos ativos. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, niches } = await listSitemapEntries();
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/ofertas` },
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
