"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma, TipoPost, StatusPost, Destino, CategoriaEditorial } from "@/lib/database";
import { slugDePostLivre } from "@/lib/conteudo/slug";
import { produtosReferenciados, resumoAutomatico } from "@/lib/conteudo/corpo";
import {
  enfileirarPost,
  enfileirarJornada,
  enfileirarJornadasNosDiasVazios,
  type ResultadoEnfileiramento,
  type ResultadoDistribuicaoDePost,
} from "@/lib/agenda/enfileirar";
import { gerarAudioTts } from "@/lib/conteudo/gemini-tts";
import { textoParaNarracao } from "@/lib/conteudo/texto-para-narracao";
import { excluirArquivoDeMidia, salvarArquivoDeAudio } from "@/lib/midia/salvar";
import {
  gerarFichaProduto,
  montarCorpoFichaProduto,
  preencherCamposVaziosDoProduto,
} from "@/lib/conteudo/gerar-ficha-produto";
import { comporArteQuadrada, salvarArteComoCapa, type TipoArte } from "@/lib/artes";
import { slugify } from "@/lib/produtos";

export interface PostFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

/** Mantém ItemDePost em dia com os shortcodes [produto:slug] presentes no corpo. */
async function sincronizarItens(postId: string, corpo: string): Promise<void> {
  // Mesmo produto pode aparecer mais de uma vez no corpo (ex: card repetido
  // de propósito, ou inserido duas vezes por engano) — dedupe preservando a
  // primeira posição, já que ItemDePost tem unique (postId, produtoId).
  const slugs = [...new Set(produtosReferenciados(corpo))];

  const produtos = slugs.length
    ? await prisma.produto.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
    : [];
  const idPorSlug = new Map(produtos.map((p) => [p.slug, p.id]));

  await prisma.$transaction(async (tx) => {
    await tx.itemDePost.deleteMany({ where: { postId } });

    const dados = slugs
      .map((slug, ordem) => ({ slug, ordem }))
      .filter(({ slug }) => idPorSlug.has(slug));

    for (const { slug, ordem } of dados) {
      await tx.itemDePost.create({
        data: { postId, produtoId: idPorSlug.get(slug)!, ordem },
      });
    }
  });
}

/** A home lista os 3 posts mais recentes — sem ela, o post editado/despublicado continua lá. */
function revalidarSitePublico(slug: string): void {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

function readForm(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "JORNADA") as TipoPost;
  const destino = (String(formData.get("destino") ?? "").trim() || "MEU_NOVO_LAR") as Destino;
  const categoriaEditorialBruta = String(formData.get("categoriaEditorial") ?? "").trim();
  const categoriaEditorial = categoriaEditorialBruta ? (categoriaEditorialBruta as CategoriaEditorial) : null;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const resumo = String(formData.get("resumo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "");
  const seoTitulo = String(formData.get("seoTitulo") ?? "").trim();
  const metaDescricao = String(formData.get("metaDescricao") ?? "").trim();
  const publicar = formData.get("publicar") === "on";
  const avisoSeguranca = formData.get("avisoSeguranca") === "on";
  const capaId = String(formData.get("capaId") ?? "").trim() || null;

  return {
    tipo,
    destino,
    categoriaEditorial,
    titulo,
    resumo,
    corpo,
    seoTitulo,
    metaDescricao,
    publicar,
    avisoSeguranca,
    capaId,
  };
}

async function validarCapa(capaId: string | null): Promise<PostFormState | null> {
  if (!capaId) return null;
  const midia = await prisma.midia.findUnique({ where: { id: capaId }, select: { id: true } });
  if (!midia) return { status: "error", message: "A capa enviada não foi encontrada. Envie de novo." };
  return null;
}

export async function createPostAction(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const dados = readForm(formData);
  if (!dados.titulo || !dados.corpo) {
    return { status: "error", message: "Título e corpo são obrigatórios." };
  }

  const erroCapa = await validarCapa(dados.capaId);
  if (erroCapa) return erroCapa;

  const sessao = await auth();

  const post = await prisma.post.create({
    data: {
      tipo: dados.tipo,
      destino: dados.destino,
      categoriaEditorial: dados.categoriaEditorial,
      titulo: dados.titulo,
      slug: await slugDePostLivre(dados.titulo),
      resumo: dados.resumo || resumoAutomatico(dados.corpo),
      corpo: dados.corpo,
      capaId: dados.capaId,
      seoTitulo: dados.seoTitulo || null,
      metaDescricao: dados.metaDescricao || null,
      status: dados.publicar ? StatusPost.PUBLICADO : StatusPost.RASCUNHO,
      publicadoEm: dados.publicar ? new Date() : null,
      avisoSeguranca: dados.avisoSeguranca,
      autorId: sessao?.user?.id ?? null,
    },
  });

  await sincronizarItens(post.id, dados.corpo);

  revalidatePath("/admin/posts");
  revalidarSitePublico(post.slug);
  redirect(`/admin/posts/${post.id}`);
}

export async function updatePostAction(id: string, _prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const dados = readForm(formData);
  if (!dados.titulo || !dados.corpo) {
    return { status: "error", message: "Título e corpo são obrigatórios." };
  }

  const erroCapa = await validarCapa(dados.capaId);
  if (erroCapa) return erroCapa;

  const atual = await prisma.post.findUniqueOrThrow({ where: { id }, select: { status: true, slug: true } });
  const jaEstavaPublicado = atual.status === StatusPost.PUBLICADO;

  await prisma.post.update({
    where: { id },
    data: {
      tipo: dados.tipo,
      destino: dados.destino,
      categoriaEditorial: dados.categoriaEditorial,
      titulo: dados.titulo,
      resumo: dados.resumo || resumoAutomatico(dados.corpo),
      corpo: dados.corpo,
      capaId: dados.capaId,
      seoTitulo: dados.seoTitulo || null,
      metaDescricao: dados.metaDescricao || null,
      status: dados.publicar ? StatusPost.PUBLICADO : StatusPost.RASCUNHO,
      publicadoEm: dados.publicar && !jaEstavaPublicado ? new Date() : undefined,
      avisoSeguranca: dados.avisoSeguranca,
    },
  });

  await sincronizarItens(id, dados.corpo);

  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  revalidarSitePublico(atual.slug);

  return { status: "success", message: "Alterações salvas." };
}

const LIMITE_EXCLUSAO_EM_LOTE = 100;

/**
 * ItemDePost e MidiaEmPost somem por cascade (ver schema) — a mídia e o produto
 * em si ficam, só o vínculo com o post cai. Apagar direto no banco deixava a
 * home servindo o post excluído até o ISR virar, por isso revalida aqui.
 */
export async function deletePostsAction(
  ids: string[],
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, message: "Nenhum post selecionado." };
  }
  if (ids.length > LIMITE_EXCLUSAO_EM_LOTE) {
    return { ok: false, message: `Selecione no máximo ${LIMITE_EXCLUSAO_EM_LOTE} posts por vez.` };
  }

  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, message: "Nenhum post selecionado." };
  }

  try {
    const posts = await prisma.post.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, slug: true },
    });
    if (posts.length === 0) {
      return { ok: false, message: "Nenhum post encontrado." };
    }

    await prisma.post.deleteMany({ where: { id: { in: posts.map((post) => post.id) } } });

    revalidatePath("/admin/posts");
    revalidatePath("/admin/fila");
    for (const post of posts) {
      revalidatePath(`/admin/posts/${post.id}`);
      revalidarSitePublico(post.slug);
    }
    return { ok: true, count: posts.length };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Não foi possível excluir os posts." };
  }
}

export async function deletePostAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const resultado = await deletePostsAction([id]);
  if (!resultado.ok) return resultado;
  return { ok: true };
}

/** Agenda a distribuição de uma Lista ou Jornada nos canais do Destino. */
export async function distribuirPostAction(postId: string): Promise<ResultadoEnfileiramento[]> {
  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { tipo: true } });
    const resultados =
      post?.tipo === TipoPost.JORNADA ? await enfileirarJornada(postId) : await enfileirarPost(postId);
    revalidatePath("/admin/fila");
    revalidatePath(`/admin/posts/${postId}`);
    return resultados;
  } catch (erro) {
    return [
      {
        canalId: "erro",
        canal: "Distribuição",
        motivoPulado: erro instanceof Error ? erro.message : "Falha ao distribuir o post.",
      },
    ];
  }
}

/** Preenche dias sem jornada às 12h no Facebook e Instagram do Meu Novo Lar. */
export async function agendarJornadasNosDiasVaziosAction(): Promise<ResultadoDistribuicaoDePost[]> {
  try {
    const saida = await enfileirarJornadasNosDiasVazios();
    revalidatePath("/admin/fila");
    revalidatePath("/admin/posts");
    return saida;
  } catch (erro) {
    return [
      {
        postId: "erro",
        post: "Agendamento",
        resultados: [
          {
            canalId: "erro",
            canal: "Agendamento",
            motivoPulado: erro instanceof Error ? erro.message : "Falha ao agendar as jornadas.",
          },
        ],
      },
    ];
  }
}

export type GerarNarracaoResultado = { ok: true; url: string } | { ok: false; erro: string };

/** Gera (ou regenera) a narração TTS do post. Cota free: 10 pedidos/dia por modelo TTS. */
export async function gerarNarracaoAction(postId: string): Promise<GerarNarracaoResultado> {
  const sessao = await auth();
  if (!sessao) return { ok: false, erro: "Não autorizado." };

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { audio: true },
    });
    if (!post) return { ok: false, erro: "Post não encontrado." };

    const script = textoParaNarracao(post.titulo, post.corpo);
    const { wav } = await gerarAudioTts(script);
    const midia = await salvarArquivoDeAudio({
      buffer: wav,
      nomeOriginal: `${post.slug}-narracao.wav`,
      alt: `Narração em áudio: ${post.titulo}`,
    });

    const audioAntigo = post.audio;

    await prisma.post.update({
      where: { id: postId },
      data: { audioId: midia.id },
    });

    if (audioAntigo && audioAntigo.id !== midia.id) {
      const aindaUsada = await prisma.post.count({
        where: { OR: [{ capaId: audioAntigo.id }, { audioId: audioAntigo.id }] },
      });
      if (aindaUsada === 0) {
        await excluirArquivoDeMidia(audioAntigo.caminho);
        await prisma.midia.delete({ where: { id: audioAntigo.id } }).catch(() => undefined);
      }
    }

    revalidatePath(`/admin/posts/${postId}`);
    revalidarSitePublico(post.slug);
    return { ok: true, url: midia.url };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao gerar a narração." };
  }
}

const TIPO_ARTE_POR_TIPO_POST: Record<string, TipoArte> = {
  JORNADA: "jornada",
  LISTA: "lista",
  PRODUTO: "produto",
};

export type GerarCapaResultado =
  | { ok: true; midia: { id: string; url: string; alt: string | null } }
  | { ok: false; message: string };

/**
 * Compõe uma capa a partir dos fundos da identidade visual (fundo + foto
 * atual + título) — mesmo pipeline usado pra imagem das publicações sociais.
 * Não altera o post: devolve a Midia pro form tratar como qualquer capa
 * enviada (o botão "Salvar" é que grava o capaId).
 */
export async function gerarCapaComFundoAction(entrada: {
  tipo: string;
  titulo: string;
  fotoUrl?: string | null;
}): Promise<GerarCapaResultado> {
  const sessao = await auth();
  if (!sessao) return { ok: false, message: "Não autorizado." };

  const titulo = entrada.titulo.trim();
  if (!titulo) return { ok: false, message: "Preencha o título antes de gerar a capa." };

  const tipoArte = TIPO_ARTE_POR_TIPO_POST[entrada.tipo];
  if (!tipoArte) return { ok: false, message: "Tipo de post inválido." };

  try {
    const arte = await comporArteQuadrada({
      tipo: tipoArte,
      semente: `${entrada.tipo}:${titulo}:${Date.now()}`,
      titulo,
      fotoUrl: entrada.fotoUrl ?? null,
    });
    if (!arte) {
      return {
        ok: false,
        message: `Ainda não há fundo cadastrado em public/fundos-posts/quadrado/${tipoArte}/. Adicione os PNGs (1080×1080, arquivos 1.png/2.png/3.png) e tente de novo.`,
      };
    }

    const midia = await salvarArteComoCapa(arte.buffer, {
      nomeBase: slugify(titulo).slice(0, 60) || "capa",
      alt: titulo,
    });

    return { ok: true, midia: { id: midia.id, url: midia.url, alt: midia.alt } };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Falha ao gerar a capa." };
  }
}

export type GerarFichaProdutoResultado = { ok: true } | { ok: false; message: string };

/** Gera descrição + utilidade via IA e grava no corpo do post tipo PRODUTO. */
export async function gerarFichaProdutoAction(postId: string): Promise<GerarFichaProdutoResultado> {
  const sessao = await auth();
  if (!sessao) return { ok: false, message: "Não autorizado." };

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        produtos: { orderBy: { ordem: "asc" }, take: 1, include: { produto: true } },
      },
    });
    if (!post) return { ok: false, message: "Post não encontrado." };
    if (post.tipo !== TipoPost.PRODUTO) {
      return { ok: false, message: "Só a ficha de produto recebe descrição e utilidade geradas." };
    }

    const produto = post.produtos[0]?.produto;
    if (!produto) {
      return { ok: false, message: "Este post não tem produto vinculado. Insira [produto:slug] no corpo e salve." };
    }

    const ficha = await gerarFichaProduto(produto);
    const corpo = montarCorpoFichaProduto(produto.slug, ficha);
    await preencherCamposVaziosDoProduto(produto.id, ficha);

    await prisma.post.update({
      where: { id: post.id },
      data: {
        corpo,
        resumo: ficha.resumo.trim() || resumoAutomatico(corpo) || produto.nome,
        metaDescricao: post.metaDescricao?.trim() ? post.metaDescricao : ficha.resumo.trim() || null,
      },
    });
    await sincronizarItens(post.id, corpo);

    revalidatePath(`/admin/posts/${post.id}`);
    revalidatePath("/admin/posts");
    revalidatePath(`/admin/produtos/${produto.id}`);
    revalidarSitePublico(post.slug);
    revalidatePath(`/produtos/${produto.slug}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Falha ao gerar a ficha." };
  }
}
