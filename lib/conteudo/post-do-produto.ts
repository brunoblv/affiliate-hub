import { revalidatePath } from "next/cache";
import { prisma, StatusPost, TipoPost, type Produto } from "@/lib/database";
import { fichaProdutoVazia, resumoAutomatico } from "@/lib/conteudo/corpo";
import { slugDePostLivre } from "@/lib/conteudo/slug";
import {
  gerarFichaProduto,
  montarCorpoFichaProduto,
  preencherCamposVaziosDoProduto,
  textoLimpoDaDescricao,
  type FichaProduto,
} from "@/lib/conteudo/gerar-ficha-produto";
import { LABEL_CATEGORIA } from "@/lib/produtos";

export interface PostDoProduto {
  id: string;
  slug: string;
}

interface CorpoDoPostProduto {
  corpo: string;
  resumo: string;
  seoTitulo: string | null;
  metaDescricao: string | null;
}

function corpoMinimo(produto: Produto): string {
  const categoria = LABEL_CATEGORIA[produto.categoria] ?? produto.categoria;
  const texto =
    textoLimpoDaDescricao(produto.descricao, 800) ||
    produto.notaEditorial?.trim() ||
    `${produto.nome} é uma opção de ${categoria.toLowerCase()} para o dia a dia da casa.`;
  return `${texto}\n\n[produto:${produto.slug}]\n`;
}

function deFicha(produto: Produto, ficha: FichaProduto): CorpoDoPostProduto {
  const corpo = montarCorpoFichaProduto(produto.slug, ficha);
  return {
    corpo,
    resumo: ficha.resumo.trim() || resumoAutomatico(corpo) || produto.nome,
    seoTitulo: ficha.seoTitulo.trim() || null,
    metaDescricao: ficha.metaDescricao.trim() || ficha.resumo.trim() || null,
  };
}

async function corpoComFicha(produto: Produto): Promise<CorpoDoPostProduto> {
  try {
    const ficha = await gerarFichaProduto(produto);
    await preencherCamposVaziosDoProduto(produto.id, ficha);
    const montado = deFicha(produto, ficha);
    if (fichaProdutoVazia(montado.corpo)) {
      throw new Error("Ficha gerada ficou sem texto útil.");
    }
    return montado;
  } catch {
    const corpo = corpoMinimo(produto);
    return {
      corpo,
      resumo: resumoAutomatico(corpo) || produto.nome,
      seoTitulo: null,
      metaDescricao: null,
    };
  }
}

/**
 * Garante um Post tipo PRODUTO publicado no blog (artigo + card no Meu Novo Lar).
 * A distribuição nas redes usa o link de afiliado direto, não este slug.
 * Reaproveita rascunho existente. Gera o texto via IA quando o corpo ainda
 * está vazio — senão a página pública sai só com o card.
 *
 * `gerarFichaComIa: false` pula a IA (import em lote do painel Shopee) e
 * deixa um texto mínimo; a ficha pode ser gerada depois no post.
 */
export async function garantirPostPublicadoDoProduto(
  produto: Produto,
  opcoes?: { gerarFichaComIa?: boolean },
): Promise<PostDoProduto> {
  const gerarFichaComIa = opcoes?.gerarFichaComIa !== false;
  const vinculos = await prisma.itemDePost.findMany({
    where: { produtoId: produto.id, post: { tipo: TipoPost.PRODUTO } },
    include: {
      post: {
        select: { id: true, slug: true, status: true, corpo: true, seoTitulo: true, metaDescricao: true },
      },
    },
  });

  const publicado = vinculos.find((item) => item.post.status === StatusPost.PUBLICADO);
  if (publicado) {
    if (!gerarFichaComIa || !fichaProdutoVazia(publicado.post.corpo)) {
      return { id: publicado.post.id, slug: publicado.post.slug };
    }
    const gerado = await corpoComFicha(produto);
    if (fichaProdutoVazia(gerado.corpo)) {
      return { id: publicado.post.id, slug: publicado.post.slug };
    }
    await prisma.post.update({
      where: { id: publicado.post.id },
      data: {
        corpo: gerado.corpo,
        resumo: gerado.resumo,
        seoTitulo: publicado.post.seoTitulo?.trim() ? publicado.post.seoTitulo : gerado.seoTitulo,
        metaDescricao: publicado.post.metaDescricao?.trim() ? publicado.post.metaDescricao : gerado.metaDescricao,
      },
    });
    revalidarPost(publicado.post.slug, produto.slug);
    return { id: publicado.post.id, slug: publicado.post.slug };
  }

  const rascunho = vinculos[0];
  if (rascunho) {
    const precisaFicha = fichaProdutoVazia(rascunho.post.corpo);
    const minimo = corpoMinimo(produto);
    const gerado: CorpoDoPostProduto = !precisaFicha
      ? {
          corpo: rascunho.post.corpo,
          resumo: resumoAutomatico(rascunho.post.corpo) || produto.nome,
          seoTitulo: rascunho.post.seoTitulo,
          metaDescricao: rascunho.post.metaDescricao,
        }
      : gerarFichaComIa
        ? await corpoComFicha(produto)
        : {
            corpo: minimo,
            resumo: resumoAutomatico(minimo) || produto.nome,
            seoTitulo: null,
            metaDescricao: null,
          };
    const post = await prisma.post.update({
      where: { id: rascunho.post.id },
      data: {
        status: StatusPost.PUBLICADO,
        publicadoEm: new Date(),
        corpo: gerado.corpo,
        resumo: gerado.resumo,
        seoTitulo: rascunho.post.seoTitulo?.trim() ? rascunho.post.seoTitulo : gerado.seoTitulo,
        metaDescricao: rascunho.post.metaDescricao?.trim() ? rascunho.post.metaDescricao : gerado.metaDescricao,
      },
      select: { id: true, slug: true },
    });
    revalidarPost(post.slug, produto.slug);
    return post;
  }

  const minimo = corpoMinimo(produto);
  const gerado: CorpoDoPostProduto = gerarFichaComIa
    ? await corpoComFicha(produto)
    : {
        corpo: minimo,
        resumo: resumoAutomatico(minimo) || produto.nome,
        seoTitulo: null,
        metaDescricao: null,
      };
  const post = await prisma.post.create({
    data: {
      tipo: TipoPost.PRODUTO,
      titulo: produto.nome,
      slug: await slugDePostLivre(produto.slug),
      resumo: gerado.resumo,
      corpo: gerado.corpo,
      seoTitulo: gerado.seoTitulo,
      metaDescricao: gerado.metaDescricao,
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
