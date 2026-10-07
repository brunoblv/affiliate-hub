import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioPlayer } from "@/components/blog/audio-player";
import { PostCover } from "@/components/blog/cover";
import { PostBody } from "@/components/blog/post-body";
import { RelatedPostCard } from "@/components/blog/post-card";
import { CATEGORIES } from "@/lib/blog/categories";
import { blogUrl } from "@/lib/blog/hosts";
import { getBlog, getPublishedPost, relatedPosts } from "@/lib/blog/queries";
import { shortDate } from "@/lib/blog/reading";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type Props = { params: Promise<{ blog: string; slug: string }> };

async function load(params: Props["params"]) {
  const { blog: subdomain, slug } = await params;
  const blog = await getBlog(subdomain);
  const post = blog ? await getPublishedPost(blog.id, slug) : null;
  return blog && post ? { blog, post } : null;
}

const absolute = (subdomain: string, url: string) => (url.startsWith("http") ? url : blogUrl(subdomain, url));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { blog, post } = found;
  const title = post.seoTitle || post.title;
  const description = post.metaDescription || post.summary || undefined;
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
      images: post.cover ? [{ url: post.cover.url, alt: post.cover.alt ?? post.title }] : undefined,
    },
    // Fichas de produto e listas são conteúdo de afiliado: abrem pelo link, mas não entram no índice.
    robots: post.kind === "EDITORIAL" ? undefined : { index: false, follow: true },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const found = await load(params);
  if (!found) notFound();
  const { blog, post } = found;

  const category = post.category ? CATEGORIES[post.category].label : null;
  const author = post.authorName || blog.authorName || blog.name;
  const showUpdated = post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > ONE_DAY_MS;
  const related = await relatedPosts(post);

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
    image: post.cover ? [absolute(blog.subdomain, post.cover.url)] : undefined,
    associatedMedia: post.audio ? { "@type": "AudioObject", contentUrl: absolute(blog.subdomain, post.audio.url), encodingFormat: "audio/wav" } : undefined,
  };

  return (
    <article className="mx-auto w-full max-w-[760px] px-5 pt-10">
      <Link href="/" className="text-sm text-blog-muted hover:text-blog-ink">
        ← Todos os artigos
      </Link>

      {category ? <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.1em] text-blog-accent-dark">{category}</p> : null}
      <h1 className={`${category ? "mt-2.5" : "mt-7"} text-[clamp(30px,5vw,40px)] font-extrabold leading-[1.15] tracking-[-0.035em] [text-wrap:balance]`}>{post.title}</h1>
      <p className="mt-3.5 text-sm text-blog-muted">
        Por{" "}
        {blog.about ? (
          <Link href="/sobre" className="font-semibold text-blog-ink hover:text-blog-accent-dark">
            {author}
          </Link>
        ) : (
          <span className="font-semibold text-blog-ink">{author}</span>
        )}
        {post.publishedAt ? ` · Publicado em ${shortDate(post.publishedAt)}` : null}
        {showUpdated ? ` · Atualizado em ${shortDate(post.updatedAt)}` : null}
      </p>

      {post.audio ? (
        <div className="mt-6">
          <AudioPlayer src={post.audio.url} />
        </div>
      ) : null}

      {post.safetyNotice ? (
        <div role="note" className="mt-6 flex gap-3 rounded-[14px] border border-warn-line bg-warn-bg px-4 py-3.5 text-sm leading-normal text-warn-ink">
          <span aria-hidden>⚠️</span>
          <span>
            <strong>Importante:</strong> nunca misture produtos de limpeza diferentes, principalmente os que têm cloro, ácidos ou outros agentes
            químicos. Faça um teste numa área pequena antes de aplicar qualquer solução.
          </span>
        </div>
      ) : null}

      {post.kind !== "PRODUCT" ? <PostCover post={post} label={category} size="lg" className="mt-7" eager /> : null}

      <div className="mt-9">
        <PostBody body={post.body} hasAffiliateLinks={post.kind !== "EDITORIAL"} />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {related.length > 0 ? (
        <section className="mt-14 border-t border-blog-line pt-9">
          <h2 className="text-xl font-extrabold tracking-[-0.02em]">Leia também</h2>
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-5">
            {related.map((item) => (
              <RelatedPostCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
