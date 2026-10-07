import Link from "next/link";
import type { PostCard as PostCardData } from "@/lib/blog/queries";
import { CATEGORIES } from "@/lib/blog/categories";

type Cover = { src: string; alt: string } | null;

export function coverOf(post: { cover: { url: string; alt: string | null } | null; title: string }, fallback: Cover): Cover {
  if (post.cover?.url) return { src: post.cover.url, alt: post.cover.alt || post.title };
  return fallback;
}

function CoverImage({ cover, className }: { cover: Cover; className: string }) {
  return (
    <div className={`blog-stripes flex items-center justify-center overflow-hidden ${className}`}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.src} alt={cover.alt} loading="lazy" className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

export function FeaturedPostCard({ post, fallback }: { post: PostCardData; fallback: Cover }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <CoverImage cover={coverOf(post, fallback)} className="aspect-[16/9] rounded-xl" />
      <div className="flex flex-col justify-center">
        <span className="mb-2.5 text-[10px] font-bold tracking-[0.08em] text-blog-accent">
          {post.category ? CATEGORIES[post.category].label.toUpperCase() : "DESTAQUE"}
        </span>
        <h2 className="font-blog-heading text-[28px] font-semibold leading-[1.22] text-blog-ink group-hover:underline">
          {post.title}
        </h2>
        {post.summary ? <p className="mt-3 text-[15px] leading-relaxed text-blog-muted">{post.summary}</p> : null}
      </div>
    </Link>
  );
}

export function PostCard({ post, fallback, compact = false }: { post: PostCardData; fallback: Cover; compact?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <CoverImage cover={coverOf(post, fallback)} className={`mb-3.5 rounded-lg ${compact ? "aspect-[16/10]" : "aspect-[16/9]"}`} />
      <h3 className={`font-blog-heading font-semibold leading-snug text-blog-ink group-hover:underline ${compact ? "text-[15px]" : "text-[17px]"}`}>
        {post.title}
      </h3>
      {!compact && post.summary ? <p className="mt-1.5 line-clamp-2 text-sm text-blog-muted">{post.summary}</p> : null}
    </Link>
  );
}
