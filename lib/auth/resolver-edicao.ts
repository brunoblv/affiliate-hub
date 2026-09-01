"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

export type ContextoEdicao = {
  href: string;
  rotulo: string;
} | null;

function segmentoUnico(pathname: string, prefixo: string): string | null {
  if (!pathname.startsWith(prefixo)) return null;
  const resto = pathname.slice(prefixo.length).replace(/\/$/, "");
  if (!resto || resto.includes("/")) return null;
  try {
    return decodeURIComponent(resto);
  } catch {
    return resto;
  }
}

/**
 * Resolve o atalho "editar esta página" a partir da URL pública.
 * Só devolve destino se houver sessão — visitantes nunca recebem IDs do admin.
 */
export async function resolverContextoEdicao(pathname: string): Promise<ContextoEdicao> {
  const sessao = await auth();
  if (!sessao?.user) return null;

  const slugBlog = segmentoUnico(pathname, "/blog/");
  if (slugBlog) {
    const post = await prisma.post.findUnique({
      where: { slug: slugBlog },
      select: { id: true },
    });
    if (post) return { href: `/admin/posts/${post.id}`, rotulo: "Editar post" };
    return null;
  }

  const slugProduto = segmentoUnico(pathname, "/produtos/");
  if (slugProduto) {
    const produto = await prisma.produto.findUnique({
      where: { slug: slugProduto },
      select: { id: true },
    });
    if (produto) return { href: `/admin/produtos/${produto.id}`, rotulo: "Editar produto" };
    return null;
  }

  if (pathname === "/vitrine" || pathname.startsWith("/vitrine/")) {
    return { href: "/admin/vitrine", rotulo: "Editar vitrine" };
  }

  return null;
}
