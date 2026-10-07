import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { referencedImages, referencedProducts } from "@/lib/blog/body";

/**
 * Escrita de posts compartilhada pelo editor, pelos assistentes de IA e pela migração.
 */

/** Slug livre dentro do blog: o próprio slugify, senão numerado. */
export async function uniquePostSlug(blogId: string, base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base).slice(0, 90) || "post";
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const taken = await prisma.post.findFirst({ where: { blogId, slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Mantém PostProduct (shortcodes [produto:slug], na ordem do texto) e PostMedia (imagens
 * do corpo) em dia com o markdown salvo.
 */
export async function syncPostRelations(postId: string, body: string): Promise<void> {
  const slugs = [...new Set(referencedProducts(body))];
  const urls = referencedImages(body).filter((url) => url.startsWith("/midia/"));
  const [products, media] = await Promise.all([
    slugs.length ? prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } }) : [],
    urls.length ? prisma.media.findMany({ where: { url: { in: urls } }, select: { id: true } }) : [],
  ]);
  const idBySlug = new Map(products.map((product) => [product.slug, product.id]));

  await prisma.$transaction([
    prisma.postProduct.deleteMany({ where: { postId } }),
    prisma.postProduct.createMany({
      data: slugs.flatMap((slug, position) => {
        const productId = idBySlug.get(slug);
        return productId ? [{ postId, productId, position }] : [];
      }),
    }),
    prisma.postMedia.deleteMany({ where: { postId } }),
    prisma.postMedia.createMany({ data: media.map((item) => ({ postId, mediaId: item.id })) }),
  ]);
}

/** Revalida todas as páginas dos blogs (o caminho real é /b/<sub>/..., via proxy). */
export function revalidateBlogs(): void {
  revalidatePath("/b/[blog]", "layout");
  revalidatePath("/admin/blog");
}
