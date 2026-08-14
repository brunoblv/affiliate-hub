import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { getSiteUrl } from "@/lib/site-url";
import { renderPostBody } from "@/lib/content/render-post-body";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      project: true,
      items: {
        orderBy: { order: "asc" },
        include: { product: true, affiliateLink: true },
      },
    },
  });

  if (!post || post.status !== "PUBLISHED" || post.project?.type !== "HOME") notFound();

  const siteUrl = getSiteUrl();

  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline">
        ← Blog
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{post.title}</h1>
      {post.publishedAt && (
        <p className="mt-2 text-sm text-muted-foreground">{post.publishedAt.toLocaleDateString("pt-BR")}</p>
      )}

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mt-6 w-full rounded-lg object-cover" />
      )}

      <div className="prose mt-8 max-w-none text-[15px]">{renderPostBody(post.body)}</div>

      {post.items.length > 0 && (
        <div className="mt-10 space-y-6">
          {post.items.map((item, index) => (
            <div key={item.id} className="rounded-lg border p-4">
              {item.label && <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>}
              <div className="mt-2 flex gap-4">
                {item.product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="h-20 w-20 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  {item.note && <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>}
                  <p className="mt-1 text-sm">
                    {item.product.originalPrice && Number(item.product.originalPrice) > Number(item.product.price) ? (
                      <>
                        <span className="text-muted-foreground line-through">
                          {formatCurrency(Number(item.product.originalPrice))}
                        </span>{" "}
                        <span className="font-semibold">{formatCurrency(Number(item.product.price))}</span>
                      </>
                    ) : (
                      <span className="font-semibold">{formatCurrency(Number(item.product.price))}</span>
                    )}
                  </p>
                  <a
                    href={`${siteUrl}/go/${item.affiliateLink.shortCode}`}
                    target="_blank"
                    rel="sponsored noopener"
                    className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Conferir oferta
                  </a>
                </div>
              </div>
              {index === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Link de afiliado — podemos receber comissão pela compra, sem custo adicional pra você.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
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
