"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma, TipoPost, StatusPost } from "@/lib/database";
import { slugify } from "@/lib/produtos";
import { produtosReferenciados, resumoAutomatico } from "@/lib/conteudo/corpo";

export interface PostFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

/** Mantém ItemDePost em dia com os shortcodes [produto:slug] presentes no corpo. */
async function sincronizarItens(postId: string, corpo: string): Promise<void> {
  const slugs = produtosReferenciados(corpo);

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
  const titulo = String(formData.get("titulo") ?? "").trim();
  const resumo = String(formData.get("resumo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "");
  const seoTitulo = String(formData.get("seoTitulo") ?? "").trim();
  const metaDescricao = String(formData.get("metaDescricao") ?? "").trim();
  const publicar = formData.get("publicar") === "on";
  const capaId = String(formData.get("capaId") ?? "").trim() || null;

  return { tipo, titulo, resumo, corpo, seoTitulo, metaDescricao, publicar, capaId };
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
      titulo: dados.titulo,
      slug: slugify(dados.titulo),
      resumo: dados.resumo || resumoAutomatico(dados.corpo),
      corpo: dados.corpo,
      capaId: dados.capaId,
      seoTitulo: dados.seoTitulo || null,
      metaDescricao: dados.metaDescricao || null,
      status: dados.publicar ? StatusPost.PUBLICADO : StatusPost.RASCUNHO,
      publicadoEm: dados.publicar ? new Date() : null,
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
      titulo: dados.titulo,
      resumo: dados.resumo || resumoAutomatico(dados.corpo),
      corpo: dados.corpo,
      capaId: dados.capaId,
      seoTitulo: dados.seoTitulo || null,
      metaDescricao: dados.metaDescricao || null,
      status: dados.publicar ? StatusPost.PUBLICADO : StatusPost.RASCUNHO,
      publicadoEm: dados.publicar && !jaEstavaPublicado ? new Date() : undefined,
    },
  });

  await sincronizarItens(id, dados.corpo);

  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  revalidarSitePublico(atual.slug);

  return { status: "success", message: "Alterações salvas." };
}

/**
 * ItemDePost e MidiaEmPost somem por cascade (ver schema) — a mídia e o produto
 * em si ficam, só o vínculo com o post cai. Apagar direto no banco deixava a
 * home servindo o post excluído até o ISR virar, por isso revalida aqui.
 */
export async function deletePostAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const post = await prisma.post.delete({ where: { id }, select: { slug: true } });

    revalidatePath("/admin/posts");
    revalidarSitePublico(post.slug);
    return { ok: true };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Não foi possível excluir o post." };
  }
}
