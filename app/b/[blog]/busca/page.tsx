import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/blog/post-card";
import { getBlog, searchPosts } from "@/lib/blog/queries";

type Props = { params: Promise<{ blog: string }>; searchParams: Promise<{ q?: string }> };

export const metadata: Metadata = { title: "Buscar", robots: { index: false, follow: true } };

export default async function BlogSearchPage({ params, searchParams }: Props) {
  const blog = await getBlog((await params).blog);
  if (!blog) notFound();
  const term = ((await searchParams).q ?? "").trim().slice(0, 100);
  const results = term ? await searchPosts(blog.id, term) : [];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pt-12 sm:px-10">
      <h1 className="text-[32px] font-extrabold tracking-[-0.035em]">Buscar artigos</h1>
      <form action="/busca" method="get" role="search" className="mt-5 flex max-w-[600px] gap-2.5">
        <label htmlFor="busca-pagina" className="sr-only">
          Termo da busca
        </label>
        <input
          id="busca-pagina"
          type="search"
          name="q"
          defaultValue={term}
          autoFocus={!term}
          placeholder="Ex.: mofo, cortina, piso"
          className="h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-blog-line bg-blog-surface px-4 text-[15px] text-blog-ink outline-none focus:border-blog-accent"
        />
        <button type="submit" className="h-12 rounded-xl bg-blog-accent px-6 text-[15px] font-bold text-white hover:bg-blog-accent-dark">
          Buscar
        </button>
      </form>

      {term && results.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-blog-muted" aria-live="polite">
            {results.length} {results.length === 1 ? "artigo encontrado" : "artigos encontrados"} para “{term}”.
          </p>
          <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-6 gap-y-10">
            {results.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      ) : null}

      {term && results.length === 0 ? (
        <div className="mt-10 flex max-w-[600px] items-center gap-5 rounded-[18px] border border-blog-line bg-blog-surface px-6 py-5" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/capi/sleep.png" alt="" className="block h-20 w-auto flex-none" />
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-bold">Sem resultados</span>
            <span className="text-sm leading-normal text-blog-muted">Nenhum artigo encontrado para “{term}”. Tente outra palavra.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
