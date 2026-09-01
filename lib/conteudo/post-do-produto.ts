import { revalidatePath } from "next/cache";
import { prisma, StatusPost, TipoPost, type Produto } from "@/lib/database";
import { resumoAutomatico } from "@/lib/conteudo/corpo";
import { slugDePostLivre } from "@/lib/conteudo/slug";

export interface PostDoProduto {
  id: string;
  slug: string;
}

function corpoDoPost(produto: Produto): string {
  const partes: string[] = [];
  if (produto.descricao?.trim()) {
    partes.push(produto.descricao.trim(), "");
  }
  partes.push(`[produto:${produto.slug}]`, "");
  return partes.join("\n");
}

/**
 * Garante um Post tipo PRODUTO publicado no blog (ficha no Meu Novo Lar).
 * A distribuição nas redes usa o link de afiliado direto, não este slug.
 * Reaproveita rascunho existente.
 */
export async function garantirPostPublicadoDoProduto(produto: Produto): Promise<PostDoProduto> {
  const vinculos = await prisma.itemDePost.findMany({
    where: { produtoId: produto.id, post: { tipo: TipoPost.PRODUTO } },
    include: { post: { select: { id: true, slug: true, status: true, corpo: true } } },
  });

  const publicado = vinculos.find((item) => item.post.status === StatusPost.PUBLICADO);
  if (publicado) return { id: publicado.post.id, slug: publicado.post.slug };

  const rascunho = vinculos[0];
  if (rascunho) {
    const corpo = rascunho.post.corpo.trim() ? rascunho.post.corpo : corpoDoPost(produto);
    const post = await prisma.post.update({
      where: { id: rascunho.post.id },
      data: {
        status: StatusPost.PUBLICADO,
        publicadoEm: new Date(),
        corpo,
        resumo: resumoAutomatico(corpo) || produto.nome,
      },
      select: { id: true, slug: true },
    });
    revalidarPost(post.slug, produto.slug);
    return post;
  }

  const corpo = corpoDoPost(produto);
  const post = await prisma.post.create({
    data: {
      tipo: TipoPost.PRODUTO,
      titulo: produto.nome,
      slug: await slugDePostLivre(produto.slug),
      resumo: resumoAutomatico(corpo) || produto.nome,
      corpo,
      status: StatusPost.PUBLICADO,
      publicadoEm: new Date(),
      produtos: { create: { produtoId: produto.id, ordem: 0 } },
    },
    select: { id: true, slug: true },
  });

  revalidarPost(post.slug, produto.slug);
  return post;
}

function revalidarPost(slugDoPost: string, slugDoProduto: string): void {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slugDoPost}`);
  revalidatePath("/admin/posts");
  revalidatePath("/");
  revalidatePath(`/produtos/${slugDoProduto}`);
}
