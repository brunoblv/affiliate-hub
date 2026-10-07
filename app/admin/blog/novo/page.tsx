import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/admin-ui";
import { BlogNav, Notice } from "@/components/blog-admin/blog-nav";
import { PostForm } from "@/components/blog-admin/post-form";
import { blogOptions } from "@/lib/blog/admin-data";

export const metadata: Metadata = { title: "Novo post · Admin", robots: { index: false, follow: false } };

export default async function NewBlogPostPage() {
  const blogs = await blogOptions();
  return (
    <AdminShell active="Blogs">
      <PageHeader title="Novo post" subtitle="Rascunho até marcar “Publicado”." />
      <BlogNav current="/admin/blog/novo" />
      {blogs.length === 0 ? (
        <Notice tone="bad">
          Cadastre um blog antes em <Link href="/admin/blog/blogs" className="underline">Blogs</Link>.
        </Notice>
      ) : (
        <PostForm
          blogs={blogs}
          initial={{
            blogId: blogs[0]!.id,
            kind: "EDITORIAL",
            category: null,
            title: "",
            summary: "",
            body: "",
            seoTitle: "",
            metaDescription: "",
            published: false,
            safetyNotice: false,
            authorName: "",
            cover: null,
            coverText: "",
          }}
        />
      )}
    </AdminShell>
  );
}
