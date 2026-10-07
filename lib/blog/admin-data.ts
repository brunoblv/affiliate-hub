import { prisma } from "@/lib/db";
import type { BlogOption } from "@/components/blog-admin/post-form";

/** Blogs para os seletores do admin (ativos primeiro). */
export async function blogOptions(): Promise<BlogOption[]> {
  return prisma.blog.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, subdomain: true, authorName: true, categories: true },
  });
}
