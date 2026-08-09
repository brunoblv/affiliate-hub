import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({ where: { slug }, include: { project: true } });

  if (!post || post.status !== "PUBLISHED") notFound();

  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline">
        ← Blog
      </Link>

      {post.project && <p className="mt-4 text-sm font-medium text-muted-foreground">{post.project.name}</p>}
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{post.title}</h1>
      {post.publishedAt && (
        <p className="mt-2 text-sm text-muted-foreground">{post.publishedAt.toLocaleDateString("pt-BR")}</p>
      )}

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mt-6 w-full rounded-lg object-cover" />
      )}

      <div className="prose mt-8 max-w-none whitespace-pre-wrap text-[15px] leading-7">{post.body}</div>
    </article>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return {};
  return {
    title: post.seoTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
  };
}
