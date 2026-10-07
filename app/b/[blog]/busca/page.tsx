import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/blog/post-card";
import { getBlog, searchPosts } from "@/lib/blog/queries";
import { blogTheme } from "@/lib/blog/themes";

type Props = { params: Promise<{ blog: string }>; searchParams: Promise<{ q?: string }> };

export const metadata: Metadata = { title: "Buscar", robots: { index: false, follow: true } };

export default async function BlogSearchPage({ params, searchParams }: Props) {
  const blog = await getBlog((await params).blog);
  if (!blog) notFound();
  const term = ((await searchParams).q ?? "").trim().slice(0, 100);
  const results = term ? await searchPosts(blog.id, term) : [];
  const fallback = blogTheme(blog.subdomain).fallbackCover;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-10">
      <h1 className="font-blog-heading text-3xl font-semibold">Buscar artigos</h1>
      <form action="/busca" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="busca-pagina" className="sr-only">
          Termo da busca
        </label>
        <input
          id="busca-pagina"
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Ex.: mofo, cortina, piso"
          className="h-11 flex-1 rounded-lg border border-blog-line bg-blog-surface px-3.5 text-[15px] outline-none focus:border-blog-accent"
        />
        <button type="submit" className="h-11 rounded-lg bg-blog-accent px-5 text-sm font-semibold text-blog-accent-ink hover:bg-blog-accent-dark">
          Buscar
        </button>
      </form>

      {term ? (
        <p className="mt-8 text-sm text-blog-muted" aria-live="polite">
          {results.length === 0
            ? `Nenhum artigo encontrado para “${term}”.`
            : `${results.length} ${results.length === 1 ? "artigo encontrado" : "artigos encontrados"} para “${term}”.`}
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((post) => (
            <PostCard key={post.id} post={post} fallback={fallback} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
