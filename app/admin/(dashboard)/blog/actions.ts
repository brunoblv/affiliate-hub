"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { BlogPostStatus, Channel } from "@/lib/generated/prisma/client";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createBlogPostAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Título é obrigatório.");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Conteúdo é obrigatório.");

  const projectId = String(formData.get("projectId") ?? "") || undefined;
  const excerpt = String(formData.get("excerpt") ?? "").trim() || undefined;
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim() || undefined;
  const status = String(formData.get("status") ?? "DRAFT") as BlogPostStatus;
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;

  const post = await prisma.blogPost.create({
    data: {
      projectId,
      title,
      slug,
      excerpt,
      body,
      coverImageUrl,
      seoTitle: title,
      metaDescription: excerpt,
      status,
      publishedAt: status === BlogPostStatus.PUBLISHED ? new Date() : undefined,
      source: "MANUAL",
    },
  });

  revalidatePath("/admin/blog");
  redirect(`/admin/blog/${post.id}`);
}

export async function updateBlogPostAction(postId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Título é obrigatório.");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Conteúdo é obrigatório.");

  const projectId = String(formData.get("projectId") ?? "") || null;
  const excerpt = String(formData.get("excerpt") ?? "").trim() || undefined;
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim() || undefined;

  await prisma.blogPost.update({
    where: { id: postId },
    data: { title, body, projectId, excerpt, coverImageUrl, seoTitle: title, metaDescription: excerpt },
  });

  revalidatePath(`/admin/blog/${postId}`);
  revalidatePath("/admin/blog");
}

export async function setBlogPostStatusAction(postId: string, status: BlogPostStatus) {
  await prisma.blogPost.update({
    where: { id: postId },
    data: { status, publishedAt: status === BlogPostStatus.PUBLISHED ? new Date() : undefined },
  });

  revalidatePath(`/admin/blog/${postId}`);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
}

/**
 * Adiciona um produto ao post (landing page "roundup", docs/rotina-coreana-10-passos-post.md).
 * Nunca cria o item sem link de afiliado real: se o produto não tiver
 * nenhum AffiliateLink cadastrado ainda, a ação falha em vez de deixar o CTA
 * sem destino ou cair pro productUrl cru (regra do AGENTS.md).
 */
export async function addBlogPostProductAction(blogPostId: string, formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) throw new Error("Selecione um produto.");

  const label = String(formData.get("label") ?? "").trim() || undefined;
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const existingAnyLink = await prisma.affiliateLink.findFirst({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
  if (!existingAnyLink) {
    throw new Error("Esse produto ainda não tem link de afiliado cadastrado — cadastre antes de adicionar ao post.");
  }

  let blogLink = await prisma.affiliateLink.findFirst({ where: { productId, channel: Channel.BLOG } });
  if (!blogLink) {
    blogLink = await prisma.affiliateLink.create({
      data: { productId, platform: product.source, channel: Channel.BLOG, affiliateUrl: existingAnyLink.affiliateUrl },
    });
  }

  const lastItem = await prisma.blogPostProduct.findFirst({ where: { blogPostId }, orderBy: { order: "desc" } });

  await prisma.blogPostProduct.create({
    data: {
      blogPostId,
      productId,
      affiliateLinkId: blogLink.id,
      order: (lastItem?.order ?? -1) + 1,
      label,
      note,
    },
  });

  revalidatePath(`/admin/blog/${blogPostId}`);
  revalidatePath("/blog");
}

export async function removeBlogPostProductAction(blogPostId: string, itemId: string) {
  await prisma.blogPostProduct.delete({ where: { id: itemId } });
  revalidatePath(`/admin/blog/${blogPostId}`);
  revalidatePath("/blog");
}

export async function moveBlogPostProductAction(blogPostId: string, itemId: string, direction: "up" | "down") {
  const items = await prisma.blogPostProduct.findMany({ where: { blogPostId }, orderBy: { order: "asc" } });
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];

  await prisma.$transaction([
    prisma.blogPostProduct.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    prisma.blogPostProduct.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/admin/blog/${blogPostId}`);
}
