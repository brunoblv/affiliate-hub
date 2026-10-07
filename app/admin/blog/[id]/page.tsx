import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { dangerButton, PageHeader, Panel } from "@/components/admin-ui";
import { BlogNav, Notice } from "@/components/blog-admin/blog-nav";
import { PostForm } from "@/components/blog-admin/post-form";
import { LarSmartTools, NarrationTool } from "@/components/blog-admin/post-tools";
import { prisma } from "@/lib/db";
import { deletePost } from "@/lib/blog/actions";
import { blogOptions } from "@/lib/blog/admin-data";
import { blogUrl } from "@/lib/blog/hosts";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "Editar post · Admin", robots: { index: false, follow: false } };

/** Ferramentas de IA chamam APIs lentas (texto, imagem, áudio). */
export const maxDuration = 180;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawParams> };

export default async function EditBlogPostPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const [post, blogs] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        blog: { select: { subdomain: true } },
        cover: { select: { id: true, url: true, alt: true } },
        audio: { select: { url: true } },
        products: { orderBy: { position: "asc" }, include: { product: { select: { slug: true, name: true } } } },
        larsmartImages: { where: { kind: "PRODUCT" }, select: { productId: true } },
      },
    }),
    blogOptions(),
  ]);
  if (!post) notFound();

  const publicUrl = blogUrl(post.blog.subdomain, `/blog/${post.slug}`);
  const withImage = new Set(post.larsmartImages.map((image) => image.productId));

  return (
    <AdminShell active="Blogs">
      <PageHeader
        title={post.title}
        subtitle={post.status === "PUBLISHED" ? "Publicado" : "Rascunho (só o admin vê)"}
        action={
          post.status === "PUBLISHED" ? (
            <a href={publicUrl} target="_blank" rel="noopener" className="text-[13px] font-semibold text-brand hover:underline">
              Ver no blog ↗
            </a>
          ) : null
        }
      />
      <BlogNav current="" />
      <Notice tone="good">{asText(query.aviso)}</Notice>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* A chave remonta o formulário quando uma ferramenta ao lado altera o post. */}
        <PostForm
          key={post.updatedAt.toISOString()}
          blogs={blogs}
          initial={{
            id: post.id,
            blogId: post.blogId,
            kind: post.kind,
            category: post.category,
            title: post.title,
            slug: post.slug,
            summary: post.summary ?? "",
            body: post.body,
            seoTitle: post.seoTitle ?? "",
            metaDescription: post.metaDescription ?? "",
            published: post.status === "PUBLISHED",
            safetyNotice: post.safetyNotice,
            authorName: post.authorName ?? "",
            cover: post.cover,
          }}
        />

        <aside className="flex flex-col gap-5">
          <Panel title="Narração">
            <NarrationTool postId={post.id} audioUrl={post.audio?.url ?? null} />
          </Panel>
          {post.larsmartBrief ? (
            <Panel title="LarSmart">
              <LarSmartTools
                postId={post.id}
                hasCover={!!post.coverId}
                products={post.products.map((item) => ({ slug: item.product.slug, name: item.product.name, hasImage: withImage.has(item.productId) }))}
              />
            </Panel>
          ) : null}
          <Panel title="Excluir">
            <form action={deletePost} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={post.id} />
              <p className="text-xs text-muted">Apaga o post. Capa, áudio e imagens que não estiverem em outro post também são apagados.</p>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" required className="size-4" /> Confirmo a exclusão
              </label>
              <button type="submit" className={dangerButton}>
                Excluir post
              </button>
            </form>
          </Panel>
        </aside>
      </div>
    </AdminShell>
  );
}
