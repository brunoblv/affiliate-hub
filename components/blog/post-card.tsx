import Link from "next/link";
import type { PostCard as PostCardData } from "@/lib/blog/queries";
import { CATEGORIES } from "@/lib/blog/categories";
import { postDate, readingTime } from "@/lib/blog/reading";
import { PostCover } from "./cover";

const categoryOf = (post: PostCardData) => (post.category ? CATEGORIES[post.category].label : null);

export function FeaturedPostCard({ post }: { post: PostCardData }) {
  const category = categoryOf(post);
  return (
    <Link href={`/blog/${post.slug}`} className="group grid items-center gap-8 text-blog-ink lg:grid-cols-[1.15fr_1fr]">
      <PostCover post={post} label={category} eyebrow={category} size="lg" eager />
      <div className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-blog-accent-dark">
          <span className="size-1.5 rounded-full bg-[#FF9F1C]" aria-hidden />
          Destaque{category ? ` · ${category}` : ""}
        </span>
        <h2 className="text-[30px] font-extrabold leading-[1.18] tracking-[-0.03em] [text-wrap:balance] group-hover:text-blog-accent-dark">{post.title}</h2>
        {post.summary ? <p className="text-[15px] leading-relaxed text-blog-muted [text-wrap:pretty]">{post.summary}</p> : null}
        <span className="text-[13px] text-blog-muted">
          {post.publishedAt ? `${postDate(post.publishedAt)} · ` : ""}
          {readingTime(post.body)}
        </span>
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: PostCardData }) {
  const category = categoryOf(post);
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-2.5 text-blog-ink">
      <PostCover post={post} label={category} size="md" />
      {category ? <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-blog-accent-dark">{category}</span> : null}
      <h3 className="text-lg font-bold leading-[1.3] tracking-[-0.02em] [text-wrap:pretty] group-hover:text-blog-accent-dark">{post.title}</h3>
      {post.summary ? <p className="line-clamp-2 text-sm leading-normal text-blog-muted">{post.summary}</p> : null}
    </Link>
  );
}

/** "Leia também": capa pequena e título. */
export function RelatedPostCard({ post }: { post: PostCardData }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-2.5 text-blog-ink">
      <PostCover post={post} size="sm" />
      <span className="text-[15px] font-bold leading-[1.35] tracking-[-0.01em] [text-wrap:pretty] group-hover:text-blog-accent-dark">{post.title}</span>
    </Link>
  );
}
