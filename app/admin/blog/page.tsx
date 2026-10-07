import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { EmptyRow, PageHeader, primaryButton } from "@/components/admin-ui";
import { BlogNav, Notice } from "@/components/blog-admin/blog-nav";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ALL_KINDS, CATEGORIES, KIND_LABELS, isKind } from "@/lib/blog/categories";
import { blogUrl } from "@/lib/blog/hosts";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "Blogs · Admin", robots: { index: false, follow: false } };

const COLUMNS = "grid-cols-[minmax(0,2.6fr)_1fr_.8fr_1fr_.9fr_.9fr]";
const date = (value: Date | null) => (value ? value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

export default async function AdminBlogPostsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const blogFilter = asText(params.blog);
  const kindFilter = asText(params.tipo);
  const statusFilter = asText(params.status);
  const term = asText(params.q);

  const where: Prisma.PostWhereInput = {
    ...(blogFilter ? { blogId: blogFilter } : {}),
    ...(isKind(kindFilter) ? { kind: kindFilter } : {}),
    ...(statusFilter === "DRAFT" || statusFilter === "PUBLISHED" ? { status: statusFilter } : {}),
    ...(term ? { title: { contains: term, mode: "insensitive" } } : {}),
  };
  const [blogs, posts, total] = await Promise.all([
    prisma.blog.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, subdomain: true } }),
    prisma.post.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      select: { id: true, title: true, slug: true, kind: true, category: true, status: true, publishedAt: true, updatedAt: true, blog: { select: { name: true, subdomain: true } } },
    }),
    prisma.post.count({ where }),
  ]);

  return (
    <AdminShell active="Blogs">
      <PageHeader
        title="Blogs"
        subtitle={`${posts.length} de ${total} posts`}
        action={
          <Link href="/admin/blog/novo" className={`${primaryButton} flex items-center`}>
            + Novo post
          </Link>
        }
      />
      <BlogNav current="/admin/blog" />
      <Notice tone="good">{asText(params.aviso)}</Notice>
      {blogs.length === 0 ? (
        <Notice tone="bad">
          Nenhum blog cadastrado ainda. Crie o primeiro em <Link href="/admin/blog/blogs" className="underline">Blogs</Link>.
        </Notice>
      ) : null}

      <form method="get" className="mb-5 flex flex-wrap gap-2.5">
        <input
          name="q"
          defaultValue={term}
          placeholder="Título"
          aria-label="Buscar por título"
          className="h-[36px] w-[220px] rounded-lg border border-line bg-surface px-2.5 text-[13px] outline-none focus:border-brand"
        />
        <select name="blog" defaultValue={blogFilter} aria-label="Blog" className="h-[36px] rounded-lg border border-line bg-surface px-2.5 text-xs font-medium outline-none focus:border-brand">
          <option value="">Todos os blogs</option>
          {blogs.map((blog) => (
            <option key={blog.id} value={blog.id}>
              {blog.name}
            </option>
          ))}
        </select>
        <select name="tipo" defaultValue={kindFilter} aria-label="Tipo" className="h-[36px] rounded-lg border border-line bg-surface px-2.5 text-xs font-medium outline-none focus:border-brand">
          <option value="">Tipo</option>
          {ALL_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={statusFilter} aria-label="Status" className="h-[36px] rounded-lg border border-line bg-surface px-2.5 text-xs font-medium outline-none focus:border-brand">
          <option value="">Status</option>
          <option value="PUBLISHED">Publicado</option>
          <option value="DRAFT">Rascunho</option>
        </select>
        <button type="submit" className="h-[36px] rounded-lg border border-line bg-surface px-3 text-xs font-semibold hover:border-brand hover:text-brand">
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <div className="min-w-[860px]">
          <div className={`grid ${COLUMNS} gap-3.5 border-b border-line bg-canvas px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted`}>
            <span>Post</span>
            <span>Blog</span>
            <span>Tipo</span>
            <span>Linha</span>
            <span>Publicado</span>
            <span>Status</span>
          </div>
          {posts.length === 0 ? <EmptyRow>Nenhum post com esses filtros.</EmptyRow> : null}
          {posts.map((post) => (
            <div key={post.id} className={`grid ${COLUMNS} items-center gap-3.5 border-b border-line-soft px-4.5 py-3 text-[13px] last:border-b-0 hover:bg-canvas`}>
              <span className="min-w-0">
                <Link href={`/admin/blog/${post.id}`} className="block truncate font-semibold hover:text-brand">
                  {post.title}
                </Link>
                {post.status === "PUBLISHED" ? (
                  <a href={blogUrl(post.blog.subdomain, `/blog/${post.slug}`)} target="_blank" rel="noopener" className="block truncate text-[11px] text-muted hover:text-brand">
                    /blog/{post.slug} ↗
                  </a>
                ) : (
                  <span className="block truncate text-[11px] text-muted">/blog/{post.slug}</span>
                )}
              </span>
              <span className="truncate text-muted">{post.blog.name}</span>
              <span className="text-muted">{KIND_LABELS[post.kind]}</span>
              <span className="truncate text-muted">{post.category ? CATEGORIES[post.category].label : "—"}</span>
              <span className="text-muted">{date(post.publishedAt)}</span>
              <StatusPill label={post.status === "PUBLISHED" ? "Publicado" : "Rascunho"} tone={post.status === "PUBLISHED" ? "good" : "warn"} />
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
