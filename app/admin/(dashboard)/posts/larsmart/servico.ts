import { prisma, TipoPost, StatusPost, Destino, CategoriaEditorial, TipoImagemLarSmart } from "@/lib/database";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resumoAutomatico, produtosReferenciados, inserirImagemAntesDoProduto, substituirSecaoDeProduto } from "@/lib/conteudo/corpo";
import { slugDePostLivre } from "@/lib/conteudo/slug";
import { interpretarTemaLarSmart, pautaAdHocDoTema } from "@/lib/conteudo/interpretar-tema-larsmart";
import { selecionarProdutosLarSmart, type ProdutoLarSmartCandidato } from "@/lib/conteudo/larsmart-selecionar-produtos";
import { gerarArtigoListaCasa } from "@/lib/conteudo/gerar-lista-casa";
import { gerarESalvarCapaDoPost, gerarHeroDeProduto, salvarArteComoCapa } from "@/lib/artes";
import { primeiraImagem, slugify } from "@/lib/produtos";
import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";
import type {
  GerarTemaLarSmartResultado,
  GerarArtigoLarSmartResultado,
  GerarImagemLarSmartResultado,
  AlvoImagemLarSmart,
  TrocarProdutoLarSmartResultado,
  ProdutoLarSmartResumo,
} from "./tipos";

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Falha inesperada.";
}

function resumoDoCandidato(produto: ProdutoLarSmartCandidato): ProdutoLarSmartResumo {
  return { slug: produto.slug, nome: produto.nome, imagem: primeiraImagem({ imagens: produto.imagens as never }), origem: produto.origem };
}

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
      await tx.itemDePost.create({ data: { postId, produtoId: idPorSlug.get(slug)!, ordem } });
    }
  });
}

/** upsert manual: @@unique(postId, produtoId, tipo) não protege contra NULLs duplicados no Postgres, então não dá pra confiar no upsert nativo do Prisma pra CAPA (produtoId null). */
async function upsertImagemLarSmart(dados: {
  postId: string;
  produtoId: string | null;
  tipo: TipoImagemLarSmart;
  midiaId: string;
  prompt: string;
  pinterestTitulo?: string | null;
  pinterestDescricao?: string | null;
}): Promise<void> {
  const existente = await prisma.imagemLarSmart.findFirst({
    where: { postId: dados.postId, produtoId: dados.produtoId, tipo: dados.tipo },
    select: { id: true },
  });
  if (existente) {
    await prisma.imagemLarSmart.update({ where: { id: existente.id }, data: dados });
  } else {
    await prisma.imagemLarSmart.create({ data: dados });
  }
}

/** Passo 1: interpreta o tópico livre e escolhe os produtos (catálogo interno + Shopee como fallback). */
export async function gerarTemaLarSmart(topico: string): Promise<GerarTemaLarSmartResultado> {
  try {
    const tema = await interpretarTemaLarSmart(topico);
    const pauta = pautaAdHocDoTema(tema);
    const selecao = await selecionarProdutosLarSmart(pauta);
    return {
      ok: true,
      pauta,
      produtos: selecao.produtos.map(resumoDoCandidato),
      doCatalogo: selecao.doCatalogo,
      doShopee: selecao.doShopee,
    };
  } catch (erro) {
    return { ok: false, erro: mensagemErro(erro) };
  }
}

/** Passo 2: gera o texto do artigo e já cria o Post como RASCUNHO (as imagens são vinculadas a ele nos passos seguintes). */
export async function gerarArtigoECriarRascunhoLarSmart(
  pauta: PautaListaCasa,
  slugs: string[],
): Promise<GerarArtigoLarSmartResultado> {
  const sessao = await auth();
  if (!sessao) return { ok: false, erro: "Não autorizado." };

  try {
    const produtos = await prisma.produto.findMany({
      where: { slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        nome: true,
        categoria: true,
        descricao: true,
        precoAtual: true,
        precoOriginal: true,
        imagens: true,
        criadoEm: true,
        destino: true,
        ativo: true,
        linkAfiliado: true,
      },
    });
    const porSlug = new Map(produtos.map((p) => [p.slug, p]));
    const ordenados = slugs.map((slug) => porSlug.get(slug)).filter((p): p is NonNullable<typeof p> => Boolean(p));

    const artigo = await gerarArtigoListaCasa(pauta, ordenados);

    const post = await prisma.post.create({
      data: {
        tipo: TipoPost.LISTA,
        destino: Destino.MEU_NOVO_LAR,
        categoriaEditorial: CategoriaEditorial.DICAS_CASA,
        titulo: artigo.titulo,
        slug: await slugDePostLivre(artigo.titulo),
        resumo: artigo.resumo || resumoAutomatico(artigo.corpo),
        corpo: artigo.corpo,
        seoTitulo: artigo.seoTitulo || null,
        metaDescricao: artigo.metaDescricao || null,
        status: StatusPost.RASCUNHO,
        avisoSeguranca: pauta.avisoSeguranca,
        autorId: sessao.user?.id ?? null,
        larsmartPauta: pauta as object,
      },
      select: { id: true, slug: true, titulo: true },
    });

    await sincronizarItens(post.id, artigo.corpo);
    revalidatePath("/admin/posts");

    return { ok: true, postId: post.id, slug: post.slug, titulo: post.titulo, produtos: ordenados.map((p) => ({ slug: p.slug, nome: p.nome })) };
  } catch (erro) {
    return { ok: false, erro: mensagemErro(erro) };
  }
}

/** Passo 3 (chamado 1x por imagem): gera a capa OU a imagem de ambiente de 1 produto, e já grava no post/corpo. */
export async function gerarImagemLarSmart(postId: string, alvo: AlvoImagemLarSmart): Promise<GerarImagemLarSmartResultado> {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, titulo: true, resumo: true, corpo: true } });
  if (!post) return { ok: false, erro: "Post não encontrado." };

  try {
    if (alvo.tipo === "CAPA") {
      const slugs = [...new Set(produtosReferenciados(post.corpo))];
      const capa = await gerarESalvarCapaDoPost({
        tipo: "lista",
        titulo: post.titulo,
        resumo: post.resumo,
        corpo: post.corpo,
        slugsProduto: slugs,
        fallbackComposicao: true,
      });
      await prisma.post.update({ where: { id: postId }, data: { capaId: capa.id } });
      await upsertImagemLarSmart({
        postId,
        produtoId: null,
        tipo: TipoImagemLarSmart.CAPA,
        midiaId: capa.id,
        prompt: "capa (gerarESalvarCapaDoPost)",
        pinterestTitulo: post.titulo,
        pinterestDescricao: post.resumo,
      });
      return { ok: true, url: capa.url, alt: capa.alt };
    }

    const produto = await prisma.produto.findUnique({ where: { slug: alvo.slug }, select: { id: true, slug: true, nome: true } });
    if (!produto) return { ok: false, erro: `Produto "${alvo.slug}" não encontrado.` };

    const hero = await gerarHeroDeProduto(produto, post.resumo ?? post.titulo);
    const midia = await salvarArteComoCapa(hero.buffer, {
      nomeBase: slugify(produto.nome).slice(0, 60) || "produto",
      alt: `${produto.nome} em um ambiente decorado`,
    });

    await upsertImagemLarSmart({
      postId,
      produtoId: produto.id,
      tipo: TipoImagemLarSmart.PRODUTO,
      midiaId: midia.id,
      prompt: hero.prompt,
      pinterestTitulo: produto.nome,
      pinterestDescricao: post.resumo,
    });

    const corpoComImagem = inserirImagemAntesDoProduto(post.corpo, produto.slug, `![${midia.alt ?? produto.nome}](${midia.url})`);
    if (corpoComImagem !== post.corpo) {
      await prisma.post.update({ where: { id: postId }, data: { corpo: corpoComImagem } });
    }

    revalidatePath(`/admin/posts/${postId}`);
    return { ok: true, url: midia.url, alt: midia.alt };
  } catch (erro) {
    return { ok: false, erro: mensagemErro(erro) };
  }
}

/** Regenera só o texto do artigo (mesma pauta/produtos), sem tocar em imagem. */
export async function regenerarArtigoLarSmart(postId: string): Promise<GerarArtigoLarSmartResultado> {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, corpo: true, larsmartPauta: true } });
  if (!post) return { ok: false, erro: "Post não encontrado." };
  const pauta = post.larsmartPauta as PautaListaCasa | null;
  if (!pauta) return { ok: false, erro: "Este post não foi gerado pelo LarSmart — edite manualmente." };

  try {
    const slugs = [...new Set(produtosReferenciados(post.corpo))];
    const produtos = await prisma.produto.findMany({
      where: { slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        nome: true,
        categoria: true,
        descricao: true,
        precoAtual: true,
        precoOriginal: true,
        imagens: true,
        criadoEm: true,
        destino: true,
        ativo: true,
        linkAfiliado: true,
      },
    });
    const porSlug = new Map(produtos.map((p) => [p.slug, p]));
    const ordenados = slugs.map((slug) => porSlug.get(slug)).filter((p): p is NonNullable<typeof p> => Boolean(p));

    const artigo = await gerarArtigoListaCasa(pauta, ordenados);

    await prisma.post.update({
      where: { id: postId },
      data: {
        titulo: artigo.titulo,
        resumo: artigo.resumo || resumoAutomatico(artigo.corpo),
        corpo: artigo.corpo,
        seoTitulo: artigo.seoTitulo || null,
        metaDescricao: artigo.metaDescricao || null,
      },
    });
    await sincronizarItens(postId, artigo.corpo);
    revalidatePath(`/admin/posts/${postId}`);

    return { ok: true, postId, slug: (await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { slug: true } })).slug, titulo: artigo.titulo, produtos: ordenados.map((p) => ({ slug: p.slug, nome: p.nome })) };
  } catch (erro) {
    return { ok: false, erro: mensagemErro(erro) };
  }
}

/** Troca um produto do rascunho por outro (catálogo, senão mais uma rodada Shopee) — não chama o Gemini de novo. */
export async function trocarProdutoLarSmart(postId: string, slugAntigo: string): Promise<TrocarProdutoLarSmartResultado> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, corpo: true, resumo: true, titulo: true, larsmartPauta: true },
  });
  if (!post) return { ok: false, erro: "Post não encontrado." };
  const pauta = post.larsmartPauta as PautaListaCasa | null;
  if (!pauta) return { ok: false, erro: "Este post não foi gerado pelo LarSmart — edite manualmente." };

  try {
    const usados = new Set(produtosReferenciados(post.corpo));
    const pautaComReforco: PautaListaCasa = { ...pauta, quantidade: usados.size + 1 };
    const selecao = await selecionarProdutosLarSmart(pautaComReforco);
    const substituto = selecao.produtos.find((p) => !usados.has(p.slug));
    if (!substituto) return { ok: false, erro: "Não achei outro produto relevante pra esse tema." };

    const hero = await gerarHeroDeProduto(substituto, post.resumo ?? post.titulo);
    const midia = await salvarArteComoCapa(hero.buffer, {
      nomeBase: slugify(substituto.nome).slice(0, 60) || "produto",
      alt: `${substituto.nome} em um ambiente decorado`,
    });

    const imagemMarkdown = `![${midia.alt ?? substituto.nome}](${midia.url})`;
    const corpoAtualizado = substituirSecaoDeProduto(post.corpo, slugAntigo, substituto.slug, substituto.nome, imagemMarkdown);

    await prisma.post.update({ where: { id: postId }, data: { corpo: corpoAtualizado } });
    await sincronizarItens(postId, corpoAtualizado);

    await upsertImagemLarSmart({
      postId,
      produtoId: substituto.id,
      tipo: TipoImagemLarSmart.PRODUTO,
      midiaId: midia.id,
      prompt: hero.prompt,
      pinterestTitulo: substituto.nome,
      pinterestDescricao: post.resumo,
    });

    revalidatePath(`/admin/posts/${postId}`);
    return {
      ok: true,
      produtoAntigoSlug: slugAntigo,
      produtoNovo: resumoDoCandidato(substituto),
      imagemUrl: midia.url,
    };
  } catch (erro) {
    return { ok: false, erro: mensagemErro(erro) };
  }
}
