import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostBody } from "@/components/blog/post-body";
import { coverOf, PostCard } from "@/components/blog/post-card";
import { CATEGORIES } from "@/lib/blog/categories";
import { blogUrl } from "@/lib/blog/hosts";
import { getBlog, getPublishedPost, relatedPosts } from "@/lib/blog/queries";
import { blogTheme } from "@/lib/blog/themes";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type Props = { params: Promise<{ blog: string; slug: string }> };

async function load(params: Props["params"]) {
  const { blog: subdomain, slug } = await params;
  const blog = await getBlog(subdomain);
  const post = blog ? await getPublishedPost(blog.id, slug) : null;
  return blog && post ? { blog, post } : null;
}

const date = (value: Date) => value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { blog, post } = found;
  const title = post.seoTitle || post.title;
  const description = post.metaDescription || post.summary || undefined;
  const cover = coverOf(post, blogTheme(blog.subdomain).fallbackCover);
  return {
    title: { absolute: `${title} · ${blog.name}` },
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: cover ? [{ url: cover.src, alt: cover.alt }] : undefined,
    },
    // Fichas de produto e listas são conteúdo de afiliado: abrem pelo link, mas não entram no índice.
    robots: post.kind === "EDITORIAL" ? undefined : { index: false, follow: true },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const found = await load(params);
  if (!found) notFound();
  const { blog, post } = found;

  const theme = blogTheme(blog.subdomain);
  const cover = post.kind === "PRODUCT" ? null : coverOf(post, null);
  const author = post.authorName || blog.authorName || blog.name;
  const showUpdated = post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > ONE_DAY_MS;
  const related = await relatedPosts(post);
  const ogCover = coverOf(post, theme.fallbackCover);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.summary || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: blogUrl(blog.subdomain, `/blog/${post.slug}`),
    author: { "@type": "Person", name: author, ...(blog.about ? { url: blogUrl(blog.subdomain, "/sobre") } : {}) },
    publisher: { "@type": "Organization", name: blog.name, url: blogUrl(blog.subdomain) },
    image: ogCover ? [ogCover.src.startsWith("http") ? ogCover.src : blogUrl(blog.subdomain, ogCover.src)] : undefined,
    associatedMedia: post.audio
      ? { "@type": "AudioObject", contentUrl: blogUrl(blog.subdomain, post.audio.url), encodingFormat: "audio/wav" }
      : undefined,
  };

  return (
    <article className="mx-auto w-full max-w-[720px] px-5 py-12">
      <Link href="/" className="text-sm text-blog-muted hover:underline">
        ← Todos os artigos
      </Link>

      {post.category ? (
        <p className="mt-6 text-[11px] font-bold tracking-[0.1em] text-blog-accent">{CATEGORIES[post.category].label.toUpperCase()}</p>
      ) : null}
      <h1 className="mt-2 font-blog-heading text-[34px] font-semibold leading-[1.18] tracking-tight sm:text-[40px]">{post.title}</h1>
      <p className="mt-3 text-sm text-blog-muted">
        Por {blog.about ? <Link href="/sobre" className="font-medium text-blog-ink hover:underline">{author}</Link> : <span className="font-medium text-blog-ink">{author}</span>}
        {post.publishedAt ? ` · Publicado em ${date(post.publishedAt)}` : null}
        {showUpdated ? ` · Atualizado em ${date(post.updatedAt)}` : null}
      </p>

      {post.audio ? (
        <div className="mt-6 rounded-lg border border-blog-line bg-blog-surface p-4">
          <p className="mb-2 text-sm font-medium">Ouça este artigo</p>
          <audio controls preload="none" className="w-full" src={post.audio.url}>
            <a href={post.audio.url}>Baixar a narração em áudio</a>
          </audio>
        </div>
      ) : null}

      {post.safetyNotice ? (
        <div role="note" className="mt-6 rounded-lg border border-warn-line bg-warn-bg p-4 text-sm text-warn-ink">
          <strong>Importante:</strong> nunca misture produtos de limpeza diferentes, principalmente os que têm cloro, ácidos
          ou outros agentes químicos. Faça um teste numa área pequena antes de aplicar qualquer solução.
        </div>
      ) : null}

      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.src} alt={cover.alt} className="mt-8 aspect-[16/9] w-full rounded-xl object-cover" />
      ) : null}

      <div className="mt-10">
        <PostBody body={post.body} hasAffiliateLinks={post.kind !== "EDITORIAL"} />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {related.length > 0 ? (
        <section className="mt-16 border-t border-blog-line pt-10">
          <h2 className="font-blog-heading text-xl font-semibold">Leia também</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} fallback={theme.fallbackCover} compact />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
