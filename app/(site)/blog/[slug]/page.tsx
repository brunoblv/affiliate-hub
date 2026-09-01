import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { CorpoDoPost } from "@/components/corpo-do-post";
import { PostsRelacionados } from "@/components/site/posts-relacionados";
import { resolverCapa } from "@/lib/conteudo/capa";
import { getSiteUrl } from "@/lib/site-url";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: { capa: true, autor: true, audio: true },
  });

  if (!post || post.status !== "PUBLICADO") notFound();

  const capa = resolverCapa(post.capa);
  const autorNome = post.autor?.name ?? "Meu Novo Lar";
  const mostrarAtualizacao =
    post.publicadoEm != null && post.atualizadoEm.getTime() - post.publicadoEm.getTime() > UM_DIA_MS;

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.titulo,
    datePublished: post.publicadoEm?.toISOString(),
    dateModified: post.atualizadoEm.toISOString(),
    author: { "@type": "Person", name: autorNome, url: `${siteUrl}/equipe` },
    image: capa ? [`${siteUrl}${capa.src}`] : undefined,
    associatedMedia: post.audio
      ? {
          "@type": "AudioObject",
          contentUrl: `${siteUrl}${post.audio.url}`,
          encodingFormat: "audio/wav",
          name: `Narração: ${post.titulo}`,
        }
      : undefined,
  };

  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline">
        ← Blog
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{post.titulo}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Por <Link href="/equipe" className="font-medium text-foreground hover:underline">{autorNome}</Link>
        {post.publicadoEm && ` • Publicado em ${post.publicadoEm.toLocaleDateString("pt-BR")}`}
        {mostrarAtualizacao && ` • Atualizado em ${post.atualizadoEm.toLocaleDateString("pt-BR")}`}
      </p>

      {post.audio && (
        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
          <p className="mb-2 text-sm font-medium">Ouça este artigo</p>
          <audio controls preload="metadata" className="w-full" src={post.audio.url}>
            <a href={post.audio.url}>Baixar a narração em áudio</a>
          </audio>
        </div>
      )}

      {post.avisoSeguranca && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠️ <strong>Importante:</strong> nunca misture produtos de limpeza diferentes, especialmente produtos à
          base de cloro, ácidos ou outros agentes químicos. Faça um teste em uma pequena área antes de aplicar
          qualquer solução.
        </div>
      )}

      {capa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={capa.src} alt={capa.alt} className="mt-6 w-full rounded-lg object-cover" />
      )}

      <div className="prose mt-8 max-w-none text-[15px]">
        <CorpoDoPost corpo={post.corpo} origem="blog" />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PostsRelacionados postId={post.id} tipo={post.tipo} categoriaEditorial={post.categoriaEditorial} />
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
    alternates: { canonical: `${getSiteUrl()}/blog/${slug}` },
    // LISTA/PRODUTO são conteúdo automático (roundup de ofertas / ficha de
    // produto), sem texto editorial — não indexar pra não diluir a
    // qualidade do site aos olhos do Google/AdSense. Só JORNADA é indexado.
    robots: post.tipo === "JORNADA" ? undefined : { index: false, follow: true },
  };
}
