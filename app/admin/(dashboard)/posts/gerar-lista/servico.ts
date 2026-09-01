import { prisma, TipoPost, StatusPost, Destino, CategoriaEditorial } from "@/lib/database";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resumoAutomatico, produtosReferenciados } from "@/lib/conteudo/corpo";
import { slugDePostLivre } from "@/lib/conteudo/slug";
import { enfileirarPost } from "@/lib/agenda/enfileirar";
import { pautaListaPorId } from "@/lib/conteudo/pauta-listas-casa";
import { escolherProdutosDaPauta } from "@/lib/conteudo/escolher-produtos-lista";
import { gerarArtigoListaCasa } from "@/lib/conteudo/gerar-lista-casa";
import type { GerarListaResultado, SalvarListaResultado } from "./tipos";

async function sincronizarItens(postId: string, corpo: string): Promise<void> {
  const slugs = [...new Set(produtosReferenciados(corpo))];
  const produtos = slugs.length
    ? await prisma.produto.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
    : [];
  const idPorSlug = new Map(produtos.map((p) => [p.slug, p.id]));

  await prisma.$transaction(async (tx) => {
    await tx.itemDePost.deleteMany({ where: { postId } });
    const dados = slugs.map((slug, ordem) => ({ slug, ordem })).filter(({ slug }) => idPorSlug.has(slug));
    for (const { slug, ordem } of dados) {
      await tx.itemDePost.create({
        data: { postId, produtoId: idPorSlug.get(slug)!, ordem },
      });
    }
  });
}

export async function gerarLista(pautaId: string): Promise<GerarListaResultado> {
  const pauta = pautaListaPorId(pautaId);
  if (!pauta) return { ok: false, erro: "Pauta não encontrada." };

  try {
    const produtos = await escolherProdutosDaPauta(pauta);
    const artigo = await gerarArtigoListaCasa(pauta, produtos);
    return {
      ok: true,
      artigo: {
        ...artigo,
        avisoSeguranca: pauta.avisoSeguranca,
        produtos: produtos.map((p) => ({ slug: p.slug, nome: p.nome })),
      },
    };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao gerar a lista com o Gemini." };
  }
}

export async function gerarESalvarLista(pautaId: string, distribuir: boolean): Promise<SalvarListaResultado> {
  const sessao = await auth();
  if (!sessao) return { ok: false, erro: "Não autorizado." };

  const gerado = await gerarLista(pautaId);
  if (!gerado.ok) return gerado;

  try {
    const post = await prisma.post.create({
      data: {
        tipo: TipoPost.LISTA,
        destino: Destino.MEU_NOVO_LAR,
        categoriaEditorial: CategoriaEditorial.DICAS_CASA,
        titulo: gerado.artigo.titulo,
        slug: await slugDePostLivre(gerado.artigo.titulo),
        resumo: gerado.artigo.resumo || resumoAutomatico(gerado.artigo.corpo),
        corpo: gerado.artigo.corpo,
        seoTitulo: gerado.artigo.seoTitulo || null,
        metaDescricao: gerado.artigo.metaDescricao || null,
        status: StatusPost.PUBLICADO,
        publicadoEm: new Date(),
        avisoSeguranca: gerado.artigo.avisoSeguranca,
        autorId: sessao.user?.id ?? null,
      },
      select: { id: true, slug: true, titulo: true },
    });

    await sincronizarItens(post.id, gerado.artigo.corpo);

    revalidatePath("/admin/posts");
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    let agendados = 0;
    if (distribuir) {
      const resultados = await enfileirarPost(post.id);
      agendados = resultados.filter((r) => r.agendadaPara).length;
      revalidatePath("/admin/fila");
    }

    return { ok: true, postId: post.id, slug: post.slug, titulo: post.titulo, agendados };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao salvar o post." };
  }
}
