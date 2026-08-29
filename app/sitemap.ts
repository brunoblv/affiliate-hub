import type { MetadataRoute } from "next";
import { prisma } from "@/lib/database";
import { getSiteUrl } from "@/lib/site-url";

const ROTAS_ESTATICAS = ["/", "/blog", "/produtos", "/ferramentas", "/sobre", "/contato", "/ofertas"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const [posts, produtos] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLICADO" },
      select: { slug: true, atualizadoEm: true, publicadoEm: true },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      select: { slug: true, atualizadoEm: true },
    }),
  ]);

  const estaticas: MetadataRoute.Sitemap = ROTAS_ESTATICAS.map((rota) => ({
    url: `${siteUrl}${rota}`,
    lastModified: new Date(),
  }));

  const doPosts: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.atualizadoEm ?? post.publicadoEm ?? new Date(),
  }));

  const doProdutos: MetadataRoute.Sitemap = produtos.map((produto) => ({
    url: `${siteUrl}/produtos/${produto.slug}`,
    lastModified: produto.atualizadoEm ?? new Date(),
  }));

  return [...estaticas, ...doPosts, ...doProdutos];
}
