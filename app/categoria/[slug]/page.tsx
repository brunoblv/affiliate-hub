import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductTile } from "@/components/product-card";
import { getNiche, listBrands, searchProducts } from "@/lib/catalog";
import { buildHref } from "@/lib/query";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const niche = await getNiche(slug);
  if (!niche) return { title: "Nicho não encontrado" };
  return {
    title: niche.name,
    description: niche.tagline || undefined,
    alternates: { canonical: `/categoria/${niche.slug}` },
  };
}

export default async function NichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = await getNiche(slug);
  if (!niche) notFound();

  const [brands, { products, total }] = await Promise.all([
    listBrands(niche.slug),
    searchProducts({ nicheSlug: niche.slug, pageSize: 24 }),
  ]);

  return (
    <>
      <SiteHeader />

      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 pt-5 sm:px-8">
        <nav aria-label="Trilha" className="py-2 pb-4 text-[13px] text-muted">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          <span className="px-1.5 text-ghost">›</span>
          <span className="text-ink">{niche.name}</span>
        </nav>

        <h1 className="text-[32px] font-extrabold tracking-[-0.035em] sm:text-4xl">{niche.name}</h1>
        {niche.tagline ? <p className="mt-2.5 text-base text-muted">{niche.tagline}</p> : null}

        {brands.length > 0 ? (
          <nav aria-label="Marcas" className="mt-6 flex flex-wrap gap-2.5">
            {brands.map((brand) => (
              <Link
                key={brand}
                href={buildHref("/busca", { categoria: niche.slug, marca: brand })}
                className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium transition-colors hover:border-brand hover:text-brand"
              >
                {brand}
              </Link>
            ))}
          </nav>
        ) : null}

        <section aria-label={`Produtos em ${niche.name}`} className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold tracking-[-0.02em]">Produtos em {niche.name}</h2>
            {total > products.length ? (
              <Link href={buildHref("/busca", { categoria: niche.slug })} className="text-[13px] font-semibold text-brand">
                Ver todos ({total})
              </Link>
            ) : null}
          </div>

          {products.length === 0 ? (
            <p className="rounded-[14px] border border-line bg-surface px-5 py-8 text-sm text-muted">
              Ainda não há produtos publicados neste nicho.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
              {products.map((product) => (
                <ProductTile key={product.slug} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
