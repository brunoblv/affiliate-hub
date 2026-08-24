import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { CorpoDoPost } from "@/components/corpo-do-post";
import { resolverCapa } from "@/lib/conteudo/capa";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: { capa: true },
  });

  if (!post || post.status !== "PUBLICADO") notFound();

  const capa = resolverCapa(post.capa);

  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline">
        ← Blog
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{post.titulo}</h1>
      {post.publicadoEm && (
        <p className="mt-2 text-sm text-muted-foreground">{post.publicadoEm.toLocaleDateString("pt-BR")}</p>
      )}

      {capa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={capa.src} alt={capa.alt} className="mt-6 w-full rounded-lg object-cover" />
      )}

      <div className="prose mt-8 max-w-none text-[15px]">
        <CorpoDoPost corpo={post.corpo} origem="blog" />
      </div>
    </article>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post) return {};
  return {
    title: post.seoTitulo ?? post.titulo,
    description: post.metaDescricao ?? post.resumo ?? undefined,
  };
}
