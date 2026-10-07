import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeaturedPostCard, PostCard } from "@/components/blog/post-card";
import { CATEGORIES, isCategory } from "@/lib/blog/categories";
import { getBlog, listedCategories, listPosts } from "@/lib/blog/queries";

const PAGE_SIZE = 13;

type Props = { params: Promise<{ blog: string }>; searchParams: Promise<{ pagina?: string; linha?: string }> };

function href(page: number, category: string | null) {
  const query = new URLSearchParams();
  if (category) query.set("linha", category);
  if (page > 1) query.set("pagina", String(page));
  const text = query.toString();
  return text ? `/?${text}` : "/";
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const blog = await getBlog((await params).blog);
  if (!blog) return {};
  const { pagina, linha } = await searchParams;
  const page = Number(pagina) || 1;
  const category = isCategory(linha) ? linha : null;
  const title = [blog.name, category ? CATEGORIES[category].label : null, page > 1 ? `página ${page}` : null].filter(Boolean).join(" — ");
  return { title: { absolute: title }, alternates: { canonical: href(page, category) } };
}

export default async function BlogIndexPage({ params, searchParams }: Props) {
  const blog = await getBlog((await params).blog);
  if (!blog) notFound();
  const { pagina, linha } = await searchParams;
  const category = isCategory(linha) ? linha : null;
  const page = Math.max(1, Math.floor(Number(pagina) || 1));
  const [{ posts, pages }, categories] = await Promise.all([listPosts(blog.id, page, PAGE_SIZE, category), listedCategories(blog.id)]);
  if (page > pages) notFound();

  const [featured, ...rest] = page === 1 ? posts : [undefined, ...posts];
  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-[7px] text-[13px] font-semibold ${active ? "border-blog-ink bg-blog-ink text-white" : "border-blog-line bg-blog-surface text-blog-ink hover:border-blog-accent"}`;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pt-12 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-extrabold tracking-[-0.04em]">{category ? CATEGORIES[category].label : "Artigos"}</h1>
          {blog.tagline ? <p className="mt-2 max-w-[560px] text-[15px] leading-[1.55] text-blog-muted">{blog.tagline}</p> : null}
        </div>
        {categories.length > 1 ? (
          <nav aria-label="Linhas editoriais" className="flex flex-wrap gap-2">
            <Link href="/" className={chip(!category)} aria-current={!category ? "page" : undefined}>
              Todos
            </Link>
            {categories.map((value) => (
              <Link key={value} href={href(1, value)} className={chip(category === value)} aria-current={category === value ? "page" : undefined}>
                {CATEGORIES[value].label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <p className="mt-16 text-center text-blog-muted">Nenhum artigo publicado ainda.</p>
      ) : (
        <>
          {featured ? (
            <div className="mt-9">
              <FeaturedPostCard post={featured} />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="mt-14 grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-6 gap-y-10">
              {rest.map((post) => (post ? <PostCard key={post.id} post={post} /> : null))}
            </div>
          ) : null}
        </>
      )}

      {pages > 1 ? (
        <nav aria-label="Paginação" className="mt-14 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={href(page - 1, category)} className="rounded-[10px] border border-blog-line bg-blog-surface px-3.5 py-2 font-semibold hover:border-blog-accent">
              ← Anteriores
            </Link>
          ) : null}
          <span className="text-blog-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1, category)} className="rounded-[10px] border border-blog-line bg-blog-surface px-3.5 py-2 font-semibold hover:border-blog-accent">
              Mais artigos →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
