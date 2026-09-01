import { prisma, TipoPost } from "@/lib/database";

export interface ProdutoExcluido {
  id: string;
  slug: string;
}

export interface PaginaAssociadaExcluida {
  id: string;
  slug: string;
}

/**
 * Apaga os produtos e as páginas de ficha ligadas a eles (Post tipo PRODUTO).
 * Listas/artigos que só citam o produto ficam — o vínculo em ItemDePost some
 * por cascade. Ordem: páginas primeiro, senão o cascade do produto órfão a ficha.
 */
export async function excluirProdutosComPaginas(ids: string[]): Promise<{
  produtos: ProdutoExcluido[];
  paginas: PaginaAssociadaExcluida[];
}> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return { produtos: [], paginas: [] };

  const produtos = await prisma.produto.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, slug: true },
  });
  if (produtos.length === 0) return { produtos: [], paginas: [] };

  const idsExistentes = produtos.map((produto) => produto.id);
  const paginas = await prisma.post.findMany({
    where: {
      tipo: TipoPost.PRODUTO,
      produtos: { some: { produtoId: { in: idsExistentes } } },
    },
    select: { id: true, slug: true },
  });

  await prisma.$transaction(async (tx) => {
    if (paginas.length > 0) {
      await tx.post.deleteMany({ where: { id: { in: paginas.map((pagina) => pagina.id) } } });
    }
    await tx.produto.deleteMany({ where: { id: { in: idsExistentes } } });
  });

  return { produtos, paginas };
}
