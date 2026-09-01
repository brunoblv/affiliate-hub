import { revalidatePath } from "next/cache";
import { prisma, StatusPost, TipoPost, type Produto } from "@/lib/database";
import { resumoAutomatico, fichaProdutoVazia } from "@/lib/conteudo/corpo";
import { slugDePostLivre } from "@/lib/conteudo/slug";
import {
  gerarFichaProduto,
  montarCorpoFichaProduto,
  preencherCamposVaziosDoProduto,
} from "@/lib/conteudo/gerar-ficha-produto";

export interface PostDoProduto {
  id: string;
  slug: string;
}

function corpoMinimo(produto: Produto): string {
  const partes: string[] = [];
  if (produto.descricao?.trim()) {
    partes.push(produto.descricao.trim(), "");
  }
  partes.push(`[produto:${produto.slug}]`, "");
  return partes.join("\n");
}

async function corpoComFicha(produto: Produto): Promise<{ corpo: string; resumo: string }> {
  try {
    const ficha = await gerarFichaProduto(produto);
    await preencherCamposVaziosDoProduto(produto.id, ficha);
    const corpo = montarCorpoFichaProduto(produto.slug, ficha);
    return { corpo, resumo: ficha.resumo.trim() || resumoAutomatico(corpo) || produto.nome };
  } catch {
    const corpo = corpoMinimo(produto);
    return { corpo, resumo: resumoAutomatico(corpo) || produto.nome };
  }
}

/**
 * Garante um Post tipo PRODUTO publicado no blog (ficha no Meu Novo Lar).
 * A distribuição nas redes usa o link de afiliado direto, não este slug.
 * Reaproveita rascunho existente. Gera descrição + utilidade via IA quando
 * o corpo ainda está vazio — senão a página pública sai só com o card.
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
    const precisaFicha = fichaProdutoVazia(rascunho.post.corpo);
    const { corpo, resumo } = precisaFicha
      ? await corpoComFicha(produto)
      : { corpo: rascunho.post.corpo, resumo: resumoAutomatico(rascunho.post.corpo) || produto.nome };
    const post = await prisma.post.update({
      where: { id: rascunho.post.id },
      data: {
        status: StatusPost.PUBLICADO,
        publicadoEm: new Date(),
        corpo,
        resumo,
      },
      select: { id: true, slug: true },
    });
    revalidarPost(post.slug, produto.slug);
    return post;
  }

  const { corpo, resumo } = await corpoComFicha(produto);
  const post = await prisma.post.create({
    data: {
      tipo: TipoPost.PRODUTO,
      titulo: produto.nome,
      slug: await slugDePostLivre(produto.slug),
      resumo,
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
