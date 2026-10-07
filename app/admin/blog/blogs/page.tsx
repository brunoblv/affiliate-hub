import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { Field, inputClass, PageHeader, Panel, primaryButton } from "@/components/admin-ui";
import { BlogNav, Notice } from "@/components/blog-admin/blog-nav";
import { prisma } from "@/lib/db";
import type { EditorialCategory } from "@/lib/generated/prisma/enums";
import { saveBlog } from "@/lib/blog/actions";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/blog/categories";
import { blogUrl } from "@/lib/blog/hosts";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "Blogs · Admin", robots: { index: false, follow: false } };

type BlogRow = Awaited<ReturnType<typeof loadBlogs>>[number];

const loadBlogs = () =>
  prisma.blog.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } });

function BlogForm({ blog }: { blog?: BlogRow }) {
  const selected = new Set<EditorialCategory>(blog?.categories ?? ["HOME_TIPS"]);
  return (
    <form action={saveBlog} className="grid gap-4">
      {blog ? <input type="hidden" name="id" value={blog.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <input name="name" defaultValue={blog?.name} required maxLength={80} className={inputClass} />
        </Field>
        <Field label="Subdomínio (meunovolar → meunovolar.capibusca.com.br)">
          <input name="subdomain" defaultValue={blog?.subdomain} required pattern="[a-z0-9-]{2,42}" maxLength={42} className={inputClass} />
        </Field>
      </div>
      <Field label="Frase de apresentação (cabeçalho, rodapé e meta description)">
        <input name="tagline" defaultValue={blog?.tagline ?? ""} maxLength={200} className={inputClass} />
      </Field>
      <Field label="Autor padrão dos posts">
        <input name="authorName" defaultValue={blog?.authorName ?? ""} maxLength={80} className={inputClass} />
      </Field>
      <Field label="Página “Sobre” (markdown; vazio = sem página)">
        <textarea name="about" defaultValue={blog?.about ?? ""} rows={6} className={`${inputClass} h-auto py-2`} />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-xs font-semibold text-muted">Linhas editoriais (cada uma precisa dos prompts em content/blogs/&lt;subdomínio&gt;/prompts)</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {ALL_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="categories" value={category} defaultChecked={selected.has(category)} className="size-4" />
              {CATEGORIES[category].label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="active" defaultChecked={blog?.active ?? true} className="size-4" />
        Ativo (desativado = subdomínio responde 404)
      </label>
      <div>
        <button type="submit" className={primaryButton}>
          {blog ? "Salvar blog" : "Criar blog"}
        </button>
      </div>
    </form>
  );
}

export default async function AdminBlogsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const blogs = await loadBlogs();
  return (
    <AdminShell active="Blogs">
      <PageHeader title="Blogs" subtitle="Cada blog vive no próprio subdomínio do Capibusca." />
      <BlogNav current="/admin/blog/blogs" />
      <Notice tone="good">{asText(params.aviso)}</Notice>
      <Notice tone="bad">{asText(params.erro)}</Notice>
      <div className="flex flex-col gap-5">
        {blogs.map((blog) => (
          <Panel
            key={blog.id}
            title={`${blog.name} · ${blog._count.posts} posts`}
            action={
              <a href={blogUrl(blog.subdomain)} target="_blank" rel="noopener" className="text-[13px] font-semibold text-brand hover:underline">
                {blogUrl(blog.subdomain).replace(/^https?:\/\//, "")} ↗
              </a>
            }
          >
            <BlogForm blog={blog} />
          </Panel>
        ))}
        <Panel title="Novo blog">
          <BlogForm />
        </Panel>
      </div>
    </AdminShell>
  );
}
