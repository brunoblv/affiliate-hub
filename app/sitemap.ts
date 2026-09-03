import type { MetadataRoute } from "next";
import { prisma, Destino } from "@/lib/database";
import { getSiteUrl } from "@/lib/site-url";

const ROTAS_ESTATICAS = ["/", "/blog", "/produtos", "/ferramentas", "/sobre", "/contato", "/ofertas", "/vitrine"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const estaticas: MetadataRoute.Sitemap = ROTAS_ESTATICAS.map((rota) => ({
    url: `${siteUrl}${rota}`,
    lastModified: new Date(),
  }));

  try {
    // Só JORNADA é indexado (ver robots noindex em blog/[slug] e
    // produtos/[slug] — LISTA/PRODUTO/fichas de produto são conteúdo
    // automático sem texto editorial): o sitemap não deve listar URLs que a
    // própria página marca como noindex.
    const [posts, landings] = await Promise.all([
      prisma.post.findMany({
        where: { status: "PUBLICADO", tipo: "JORNADA" },
        select: { slug: true, atualizadoEm: true, publicadoEm: true },
      }),
      prisma.landingDiaria.findMany({
        where: { status: "PUBLICADA", destino: Destino.MEU_NOVO_LAR },
        select: { slug: true, geradaEm: true, data: true },
      }),
    ]);

    const doPosts: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.atualizadoEm ?? post.publicadoEm ?? new Date(),
    }));

    const doVitrine: MetadataRoute.Sitemap = landings.map((landing) => ({
      url: `${siteUrl}/vitrine/${landing.slug}`,
      lastModified: landing.geradaEm ?? landing.data,
    }));

    return [...estaticas, ...doPosts, ...doVitrine];
  } catch {
    // Sitemap quebrado é pior que sitemap só com rotas institucionais.
    return estaticas;
  }
}
