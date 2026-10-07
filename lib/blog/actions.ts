"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import type { EditorialCategory, PostKind } from "@/lib/generated/prisma/enums";
import { autoSummary, isEmptyProductSheet, referencedProducts } from "@/lib/blog/body";
import { ALL_CATEGORIES, isCategory, isKind } from "@/lib/blog/categories";
import { isValidSubdomain } from "@/lib/blog/hosts";
import { revalidateBlogs, syncPostRelations, uniquePostSlug } from "@/lib/blog/posts";
import { generateCover } from "@/lib/blog/covers/generate";
import { addOpinion } from "@/lib/blog/ai/editorial";
import { writeProductSheet } from "@/lib/blog/ai/product-sheet";
import { deleteMediaIfUnused } from "@/lib/media/storage";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Blogs
// ---------------------------------------------------------------------------

export async function saveBlog(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const subdomain = text(data, "subdomain").toLowerCase();
  const name = text(data, "name");
  const back = (error: string) => redirect(`/admin/blog/blogs?erro=${encodeURIComponent(error)}`);
  if (!name) back("Informe o nome do blog.");
  if (!isValidSubdomain(subdomain)) back("Subdomínio inválido: use letras minúsculas, números e hífen.");

  const fields = {
    subdomain,
    name,
    tagline: text(data, "tagline") || null,
    about: text(data, "about") || null,
    authorName: text(data, "authorName") || null,
    categories: data.getAll("categories").map(String).filter(isCategory),
    active: data.get("active") === "on",
  };
  const clash = await prisma.blog.findFirst({ where: { subdomain, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (clash) back(`O subdomínio "${subdomain}" já está em uso.`);

  if (id) await prisma.blog.update({ where: { id }, data: fields });
  else await prisma.blog.create({ data: { ...fields, categories: fields.categories.length ? fields.categories : ["HOME_TIPS"] } });
  revalidateBlogs();
  redirect("/admin/blog/blogs?aviso=Blog%20salvo.");
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface PostFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

function readPostForm(data: FormData) {
  const kind = text(data, "kind");
  const category = text(data, "category");
  return {
    blogId: text(data, "blogId"),
    kind: (isKind(kind) ? kind : "EDITORIAL") as PostKind,
    category: (isCategory(category) ? category : null) as EditorialCategory | null,
    title: text(data, "title"),
    summary: text(data, "summary"),
    body: String(data.get("body") ?? "").replace(/\r\n/g, "\n"),
    seoTitle: text(data, "seoTitle") || null,
    metaDescription: text(data, "metaDescription") || null,
    publish: data.get("publish") === "on",
    safetyNotice: data.get("safetyNotice") === "on",
    coverId: text(data, "coverId") || null,
    coverText: text(data, "coverText").slice(0, 40) || null,
    authorName: text(data, "authorName") || null,
    slug: text(data, "slug"),
  };
}

export async function savePost(id: string | null, _prev: PostFormState, data: FormData): Promise<PostFormState> {
  await requireAdmin();
  const form = readPostForm(data);
  if (!form.title || !form.body.trim()) return { status: "error", message: "Título e corpo são obrigatórios." };
  const blog = await prisma.blog.findUnique({ where: { id: form.blogId }, select: { id: true } });
  if (!blog) return { status: "error", message: "Escolha o blog do post." };
  if (form.coverId && !(await prisma.media.findUnique({ where: { id: form.coverId }, select: { id: true } }))) {
    return { status: "error", message: "A capa enviada não foi encontrada. Envie de novo." };
  }

  const current = id ? await prisma.post.findUnique({ where: { id }, select: { status: true, publishedAt: true, coverId: true, blogId: true } }) : null;
  if (id && !current) return { status: "error", message: "Post não encontrado." };

  const fields = {
    blogId: blog.id,
    kind: form.kind,
    category: form.category,
    title: form.title,
    summary: form.summary || autoSummary(form.body) || null,
    body: form.body,
    coverId: form.coverId,
    coverText: form.coverText,
    seoTitle: form.seoTitle,
    metaDescription: form.metaDescription,
    status: form.publish ? ("PUBLISHED" as const) : ("DRAFT" as const),
    publishedAt: form.publish ? (current?.publishedAt ?? new Date()) : (current?.publishedAt ?? null),
    safetyNotice: form.safetyNotice,
    authorName: form.authorName,
  };

  let postId = id;
  if (id) {
    const slug = form.slug ? await uniquePostSlug(blog.id, form.slug, id) : undefined;
    await prisma.post.update({ where: { id }, data: { ...fields, ...(slug ? { slug } : {}) } });
  } else {
    const created = await prisma.post.create({ data: { ...fields, slug: await uniquePostSlug(blog.id, form.slug || form.title) } });
    postId = created.id;
  }
  await syncPostRelations(postId!, form.body);
  if (current?.coverId && current.coverId !== form.coverId) await deleteMediaIfUnused(current.coverId);
  revalidateBlogs();

  redirect(`/admin/blog/${postId}?aviso=${encodeURIComponent(id ? "Alterações salvas." : "Post criado.")}`);
}

export async function deletePost(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const post = await prisma.post.findUnique({ where: { id }, select: { coverId: true, audioId: true, media: { select: { mediaId: true } } } });
  if (post) {
    await prisma.post.delete({ where: { id } });
    // Mídia sem outro uso sai junto; a usada em outro post fica.
    for (const mediaId of [post.coverId, post.audioId, ...post.media.map((item) => item.mediaId)]) {
      if (mediaId) await deleteMediaIfUnused(mediaId);
    }
  }
  revalidateBlogs();
  redirect("/admin/blog?aviso=Post%20exclu%C3%ADdo.");
}

/** Publica os produtos em rascunho citados no post (o card só aparece com o produto publicado). */
export async function publishPostProducts(postId: string): Promise<ActionResult<{ count: number }>> {
  await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { body: true } });
  if (!post) return { ok: false, error: "Post não encontrado." };
  const result = await prisma.product.updateMany({ where: { slug: { in: referencedProducts(post.body) }, status: "DRAFT" }, data: { status: "PUBLISHED" } });
  revalidateBlogs();
  return { ok: true, count: result.count };
}

// ---------------------------------------------------------------------------
// Ferramentas do editor (IA)
// ---------------------------------------------------------------------------

export async function generateCoverAction(input: {
  blogId: string;
  kind: string;
  title: string;
  summary?: string;
  body?: string;
  previousCoverId?: string | null;
}): Promise<ActionResult<{ media: { id: string; url: string; alt: string | null } }>> {
  await requireAdmin();
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Preencha o título antes de gerar a capa." };
  const blog = await prisma.blog.findUnique({ where: { id: input.blogId }, select: { subdomain: true } });
  if (!blog) return { ok: false, error: "Escolha o blog antes de gerar a capa." };
  try {
    const media = await generateCover({ blog, kind: isKind(input.kind) ? input.kind : "EDITORIAL", title, summary: input.summary, body: input.body });
    // Capa gerada antes e ainda não salva em post nenhum: some.
    if (input.previousCoverId && input.previousCoverId !== media.id) await deleteMediaIfUnused(input.previousCoverId);
    return { ok: true, media: { id: media.id, url: media.url, alt: media.alt } };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao gerar a capa.") };
  }
}

/** Acrescenta o bloco de opinião própria ao corpo (devolve o texto; o editor decide salvar). */
export async function addOpinionAction(input: { blogId: string; title: string; summary: string; body: string; category: string }): Promise<ActionResult<{ body: string }>> {
  await requireAdmin();
  const blog = await prisma.blog.findUnique({ where: { id: input.blogId }, select: { id: true, subdomain: true } });
  if (!blog) return { ok: false, error: "Escolha o blog do post." };
  if (!input.body.trim()) return { ok: false, error: "O corpo está vazio." };
  try {
    const body = await addOpinion(blog, { title: input.title, summary: input.summary || null, body: input.body, category: isCategory(input.category) ? input.category : null });
    return { ok: true, body };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao acrescentar a opinião.") };
  }
}

/** Texto da ficha de um produto (post PRODUCT); devolve os campos para o editor revisar. */
export async function productSheetAction(input: { blogId: string; body: string }): Promise<
  ActionResult<{ body: string; summary: string; seoTitle: string; metaDescription: string }>
> {
  await requireAdmin();
  const blog = await prisma.blog.findUnique({ where: { id: input.blogId }, select: { subdomain: true, name: true } });
  if (!blog) return { ok: false, error: "Escolha o blog do post." };
  const slug = referencedProducts(input.body)[0];
  if (!slug) return { ok: false, error: "Insira o produto no corpo ([produto:slug]) antes de gerar a ficha." };
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return { ok: false, error: `Produto "${slug}" não encontrado no catálogo.` };
  try {
    const sheet = await writeProductSheet(blog, product.id);
    if (isEmptyProductSheet(sheet.corpo)) return { ok: false, error: "A ficha gerada ficou sem texto útil. Tente de novo." };
    return { ok: true, body: sheet.corpo, summary: sheet.resumo, seoTitle: sheet.seoTitulo, metaDescription: sheet.metaDescricao };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao gerar a ficha do produto.") };
  }
}

export interface EditorProduct {
  slug: string;
  name: string;
  image: string | null;
  published: boolean;
}

/** Busca no catálogo para inserir [produto:slug] no corpo. */
export async function searchCatalogProducts(term: string): Promise<EditorProduct[]> {
  await requireAdmin();
  const words = term.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return [];
  const rows = await prisma.product.findMany({
    where: { AND: words.map((word) => ({ OR: [{ searchText: { contains: word } }, { slug: { contains: word } }] })) },
    select: { slug: true, name: true, status: true, images: { where: { broken: false }, orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } } },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
    take: 20,
  });
  return rows.map((row) => ({ slug: row.slug, name: row.name, image: row.images[0]?.url ?? null, published: row.status === "PUBLISHED" }));
}

/** Situação dos produtos citados no corpo: avisa os inexistentes e os rascunhos. */
export async function inspectBodyProducts(body: string): Promise<EditorProduct[]> {
  await requireAdmin();
  const slugs = [...new Set(referencedProducts(body))];
  if (!slugs.length) return [];
  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, status: true, images: { where: { broken: false }, take: 1, select: { url: true } } },
  });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return slugs.map((slug) => {
    const row = bySlug.get(slug);
    return row
      ? { slug, name: row.name, image: row.images[0]?.url ?? null, published: row.status === "PUBLISHED" }
      : { slug, name: "(não existe no catálogo)", image: null, published: false };
  });
}

// ---------------------------------------------------------------------------
// Jornada
// ---------------------------------------------------------------------------

export async function addJourneyNote(data: FormData) {
  await requireAdmin();
  const blogId = text(data, "blogId");
  const noteText = text(data, "text");
  const category = text(data, "category");
  if (blogId && noteText) {
    await prisma.journeyNote.create({ data: { blogId, text: noteText.slice(0, 5000), category: isCategory(category) ? category : null } });
  }
  redirect(`/admin/blog/jornada?blog=${encodeURIComponent(blogId)}`);
}

export async function deleteJourneyNote(data: FormData) {
  await requireAdmin();
  const note = await prisma.journeyNote.delete({ where: { id: text(data, "id") } }).catch(() => null);
  redirect(`/admin/blog/jornada${note ? `?blog=${note.blogId}` : ""}`);
}

export async function categoriesOf(blogId: string): Promise<EditorialCategory[]> {
  await requireAdmin();
  const blog = await prisma.blog.findUnique({ where: { id: blogId }, select: { categories: true } });
  return blog?.categories.length ? blog.categories : ALL_CATEGORIES;
}
