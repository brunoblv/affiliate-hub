"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { BlogPostStatus } from "@/lib/generated/prisma/client";

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
}
