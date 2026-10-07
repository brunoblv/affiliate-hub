import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeaturedPostCard, PostCard } from "@/components/blog/post-card";
import { getBlog, listPosts } from "@/lib/blog/queries";
import { blogTheme } from "@/lib/blog/themes";

const PAGE_SIZE = 13;

type Props = { params: Promise<{ blog: string }>; searchParams: Promise<{ pagina?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const blog = await getBlog((await params).blog);
  if (!blog) return {};
  const page = Number((await searchParams).pagina) || 1;
  return {
    title: { absolute: page > 1 ? `${blog.name} — página ${page}` : blog.name },
    alternates: { canonical: page > 1 ? `/?pagina=${page}` : "/" },
  };
}

export default async function BlogIndexPage({ params, searchParams }: Props) {
  const blog = await getBlog((await params).blog);
  if (!blog) notFound();
  const page = Math.max(1, Math.floor(Number((await searchParams).pagina) || 1));
  const { posts, pages } = await listPosts(blog.id, page, PAGE_SIZE);
  if (page > pages) notFound();

  const fallback = blogTheme(blog.subdomain).fallbackCover;
  const [featured, ...rest] = page === 1 ? posts : [undefined, ...posts];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-10">
      <h1 className="font-blog-heading text-4xl font-semibold">{page === 1 ? "Artigos" : `Artigos — página ${page}`}</h1>
      {blog.tagline ? <p className="mt-2 max-w-xl text-[15px] text-blog-muted">{blog.tagline}</p> : null}

      {posts.length === 0 ? (
        <p className="mt-16 text-center text-blog-muted">Nenhum artigo publicado ainda.</p>
      ) : (
        <>
          {featured ? (
            <div className="mt-9">
              <FeaturedPostCard post={featured} fallback={fallback} />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (post ? <PostCard key={post.id} post={post} fallback={fallback} /> : null))}
            </div>
          ) : null}
        </>
      )}

      {pages > 1 ? (
        <nav aria-label="Paginação" className="mt-14 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={page === 2 ? "/" : `/?pagina=${page - 1}`} className="rounded-md border border-blog-line px-3 py-1.5 hover:bg-blog-soft">
              ← Anteriores
            </Link>
          ) : null}
          <span className="text-blog-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={`/?pagina=${page + 1}`} className="rounded-md border border-blog-line px-3 py-1.5 hover:bg-blog-soft">
              Mais artigos →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
