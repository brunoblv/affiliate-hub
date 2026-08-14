"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma, TipoPost, StatusPost } from "@/lib/database";
import { slugify } from "@/lib/produtos";
import { produtosReferenciados, resumoAutomatico } from "@/lib/conteudo/corpo";

export interface PostFormState {
  status: "idle" | "error";
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

function readForm(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "JORNADA") as TipoPost;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const resumo = String(formData.get("resumo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "");
  const seoTitulo = String(formData.get("seoTitulo") ?? "").trim();
  const metaDescricao = String(formData.get("metaDescricao") ?? "").trim();
  const publicar = formData.get("publicar") === "on";

  return { tipo, titulo, resumo, corpo, seoTitulo, metaDescricao, publicar };
}

export async function createPostAction(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const dados = readForm(formData);
  if (!dados.titulo || !dados.corpo) {
    return { status: "error", message: "Título e corpo são obrigatórios." };
  }

  const sessao = await auth();

  const post = await prisma.post.create({
    data: {
      tipo: dados.tipo,
      titulo: dados.titulo,
      slug: slugify(dados.titulo),
      resumo: dados.resumo || resumoAutomatico(dados.corpo),
      corpo: dados.corpo,
      seoTitulo: dados.seoTitulo || null,
      metaDescricao: dados.metaDescricao || null,
      status: dados.publicar ? StatusPost.PUBLICADO : StatusPost.RASCUNHO,
      publicadoEm: dados.publicar ? new Date() : null,
      autorId: sessao?.user?.id ?? null,
    },
  });

  await sincronizarItens(post.id, dados.corpo);

  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${post.id}`);
}

export async function updatePostAction(id: string, _prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const dados = readForm(formData);
  if (!dados.titulo || !dados.corpo) {
    return { status: "error", message: "Título e corpo são obrigatórios." };
  }

  const atual = await prisma.post.findUniqueOrThrow({ where: { id }, select: { status: true } });
  const jaEstavaPublicado = atual.status === StatusPost.PUBLICADO;

  await prisma.post.update({
    where: { id },
    data: {
      tipo: dados.tipo,
      titulo: dados.titulo,
      resumo: dados.resumo || resumoAutomatico(dados.corpo),
      corpo: dados.corpo,
      seoTitulo: dados.seoTitulo || null,
      metaDescricao: dados.metaDescricao || null,
      status: dados.publicar ? StatusPost.PUBLICADO : StatusPost.RASCUNHO,
      publicadoEm: dados.publicar && !jaEstavaPublicado ? new Date() : undefined,
    },
  });

  await sincronizarItens(id, dados.corpo);

  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath("/blog");

  return { status: "idle" };
}
