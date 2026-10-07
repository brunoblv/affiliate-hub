"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { isCategory } from "@/lib/blog/categories";
import { isTheme, suggestThemes, writeArticle, type Article, type Theme } from "@/lib/blog/ai/editorial";
import { listBriefs, pickProducts, writeList, type ListBrief } from "@/lib/blog/lists";
import { createDraft, generateImageFor, interpretTopic, isListBrief, regenerateText, selectProducts, swapProduct, type ImageTarget, type LarSmartProduct } from "@/lib/blog/larsmart";
import { generateCover } from "@/lib/blog/covers/generate";
import { revalidateBlogs, syncPostRelations, uniquePostSlug } from "@/lib/blog/posts";
import type { ActionResult } from "@/lib/blog/actions";

/**
 * Ações de IA do admin do blog. Chamadas longas (até ~2 min): o nginx precisa de
 * proxy_read_timeout >= 180s (ver docs/blogs.md).
 */
const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

async function blogOf(blogId: string) {
  const blog = await prisma.blog.findUnique({ where: { id: blogId }, select: { id: true, subdomain: true, authorName: true } });
  if (!blog) throw new Error("Blog não encontrado.");
  return blog;
}

// --- Artigo editorial -------------------------------------------------------

export async function suggestThemeAction(blogId: string, category: string): Promise<ActionResult<{ theme: Theme }>> {
  await requireAdmin();
  if (!isCategory(category)) return { ok: false, error: "Categoria inválida." };
  try {
    const [theme] = await suggestThemes(await blogOf(blogId), category, 1);
    if (!theme) return { ok: false, error: "Nenhum tema novo veio de volta (todos colidiram com títulos existentes). Tente de novo." };
    return { ok: true, theme };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao sugerir tema.") };
  }
}

export async function writeArticleAction(blogId: string, category: string, theme: unknown): Promise<ActionResult<{ article: Article }>> {
  await requireAdmin();
  if (!isCategory(category) || !isTheme(theme)) return { ok: false, error: "Pedido inválido." };
  try {
    return { ok: true, article: await writeArticle(await blogOf(blogId), theme, category) };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao gerar o artigo.") };
  }
}

// --- Listas por pauta ---------------------------------------------------------

export async function listBriefsAction(blogId: string): Promise<ListBrief[]> {
  await requireAdmin();
  const blog = await prisma.blog.findUnique({ where: { id: blogId }, select: { subdomain: true } });
  return blog ? listBriefs(blog.subdomain) : [];
}

/** Gera a lista da pauta, salva como RASCUNHO com capa e devolve o id para o editor. */
export async function generateListAction(blogId: string, briefId: string): Promise<ActionResult<{ postId: string; warning?: string }>> {
  await requireAdmin();
  try {
    const blog = await blogOf(blogId);
    const brief = (await listBriefs(blog.subdomain)).find((item) => item.id === briefId);
    if (!brief) return { ok: false, error: "Pauta não encontrada." };

    const products = await pickProducts(blog.id, brief);
    const article = await writeList(blog, brief, products.map((item) => ({ slug: item.slug, name: item.name, description: item.description })));
    const post = await prisma.post.create({
      data: {
        blogId: blog.id,
        kind: "LIST",
        category: "HOME_TIPS",
        title: article.titulo,
        slug: await uniquePostSlug(blog.id, article.titulo),
        summary: article.resumo || null,
        body: article.corpo,
        seoTitle: article.seoTitulo || null,
        metaDescription: article.metaDescricao || null,
        status: "DRAFT",
        safetyNotice: brief.avisoSeguranca,
        authorName: blog.authorName,
      },
    });
    await syncPostRelations(post.id, article.corpo);

    let warning: string | undefined;
    try {
      const cover = await generateCover({ blog, kind: "LIST", title: article.titulo, summary: article.resumo, body: article.corpo, productSlugs: products.map((item) => item.slug), hint: brief.dica, allowFallback: true });
      await prisma.post.update({ where: { id: post.id }, data: { coverId: cover.id } });
    } catch (error) {
      warning = `Post criado sem capa: ${message(error, "falha ao gerar a capa")}.`;
    }
    revalidateBlogs();
    return { ok: true, postId: post.id, warning };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao gerar a lista.") };
  }
}

// --- LarSmart -----------------------------------------------------------------

export async function larsmartThemeAction(blogId: string, topic: string): Promise<
  ActionResult<{ brief: ListBrief; products: LarSmartProduct[]; fromCatalog: number; fromShopee: number }>
> {
  await requireAdmin();
  try {
    const blog = await blogOf(blogId);
    const brief = await interpretTopic(blog, topic);
    return { ok: true, brief, ...(await selectProducts(blog, brief)) };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao interpretar o tema.") };
  }
}

export async function larsmartDraftAction(blogId: string, brief: unknown, slugs: string[]): Promise<
  ActionResult<{ postId: string; title: string; products: { slug: string; name: string }[] }>
> {
  await requireAdmin();
  if (!isListBrief(brief) || !Array.isArray(slugs) || slugs.length < 3) return { ok: false, error: "Pedido inválido." };
  try {
    const blog = await blogOf(blogId);
    const post = await createDraft(blog, brief, slugs.map(String).slice(0, 8), blog.authorName);
    revalidateBlogs();
    return { ok: true, postId: post.id, title: post.title, products: post.products };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao escrever o artigo.") };
  }
}

async function postBlog(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { blog: { select: { id: true, subdomain: true } } } });
  if (!post) throw new Error("Post não encontrado.");
  return post.blog;
}

export async function larsmartImageAction(postId: string, target: ImageTarget): Promise<ActionResult<{ url: string; alt: string | null }>> {
  await requireAdmin();
  try {
    const result = await generateImageFor(await postBlog(postId), postId, target);
    revalidateBlogs();
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao gerar a imagem.") };
  }
}

export async function larsmartRegenerateAction(postId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await regenerateText(await postBlog(postId), postId);
    revalidateBlogs();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao reescrever o texto.") };
  }
}

export async function larsmartSwapAction(postId: string, oldSlug: string): Promise<ActionResult<{ product: LarSmartProduct }>> {
  await requireAdmin();
  try {
    const product = await swapProduct(await postBlog(postId), postId, oldSlug);
    revalidateBlogs();
    return { ok: true, product };
  } catch (error) {
    return { ok: false, error: message(error, "Falha ao trocar o produto.") };
  }
}
