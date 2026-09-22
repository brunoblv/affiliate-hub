import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { Sparkline } from "@/components/price-history";
import { CategoryIcon, SearchIcon } from "@/components/icons";
import { ProductImage } from "@/components/photo";
import { catalogCounts, listDrops, listFeatured, listNiches } from "@/lib/catalog";
import { integer, money, moneyShort } from "@/lib/format";

export default async function HomePage() {
  const [niches, featured, drops, counts] = await Promise.all([
    listNiches(),
    listFeatured(8),
    listDrops(6),
    catalogCounts(),
  ]);

  return (
    <>
      <SiteHeader />

      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-8">
        <section className="py-14 text-center sm:py-20">
          <h1 className="mx-auto max-w-[760px] text-4xl font-extrabold leading-[1.06] tracking-[-0.035em] text-balance sm:text-[52px]">
            Compare preços. Encontre a melhor oferta.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-base leading-relaxed text-muted sm:text-[17px]">
            Pesquise um produto e compare as ofertas que monitoramos nas principais lojas em um só
            lugar.
          </p>

          <form
            action="/busca"
            role="search"
            className="mx-auto mt-9 flex max-w-[660px] flex-col gap-2.5 sm:flex-row"
          >
            <label htmlFor="busca-home" className="sr-only">
              Busque por produto, marca ou modelo
            </label>
            <div className="flex h-14 flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4.5 shadow-raised focus-within:border-brand">
              <SearchIcon size={18} className="flex-none text-muted" />
              <input
                id="busca-home"
                name="q"
                type="search"
                placeholder="Busque por produto, marca ou modelo"
                className="h-full w-full bg-transparent text-base outline-none placeholder:text-muted"
              />
            </div>
            <button
              type="submit"
              className="h-14 flex-none rounded-[10px] bg-brand px-8 text-base font-semibold text-surface transition-colors hover:bg-brand-dark"
            >
              Buscar
            </button>
          </form>

          {counts.offers > 0 ? (
            <p className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[13px] text-muted">
              <span>
                {integer(counts.offers)} {counts.offers === 1 ? "oferta monitorada" : "ofertas monitoradas"}
              </span>
              <span>
                {counts.stores} {counts.stores === 1 ? "loja" : "lojas"}
              </span>
            </p>
          ) : null}
        </section>

        {niches.length > 0 ? (
          <section aria-labelledby="categorias">
            <h2 id="categorias" className="mb-5 text-xl font-bold tracking-[-0.02em]">
              Explore por nicho
            </h2>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {niches.map((category) => (
                <li key={category.slug} className="min-w-0">
                  <Link
                    href={`/categoria/${category.slug}`}
                    className="flex h-[76px] items-center gap-3 rounded-xl border border-line bg-surface px-4 transition-colors hover:border-brand"
                  >
                    <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-soft text-brand">
                      <CategoryIcon name={category.icon} />
                    </span>
                    <span className="line-clamp-2 min-w-0 break-words text-sm font-semibold leading-tight" title={category.name}>
                      {category.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {featured.length > 0 ? (
          <section aria-labelledby="destaques" className="mt-16">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 id="destaques" className="text-xl font-bold tracking-[-0.02em]">
                Ofertas atualizadas
              </h2>
              <Link href="/ofertas" className="text-[13px] font-semibold text-brand">
                Ver todas
              </Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {featured.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-16 rounded-[14px] border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            O catálogo está sendo montado. Volte em breve para comparar preços.
          </p>
        )}

        {drops.length > 0 ? (
          <section aria-labelledby="quedas" className="mt-16">
            <h2 id="quedas" className="mb-5 text-xl font-bold tracking-[-0.02em]">
              Preços que caíram
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {drops.map(({ product, series, fromCents, toCents }) => (
                <Link
                  key={product.slug}
                  href={`/produto/${product.slug}`}
                  className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4.5 transition-colors hover:border-brand"
                >
                  <div className="flex items-center gap-4">
                    <ProductImage product={product} className="h-[72px] w-[72px] flex-none" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-sm font-semibold leading-tight">{product.name}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] text-muted line-through">{moneyShort(fromCents)}</span>
                        <span className="text-[22px] font-extrabold tracking-[-0.03em]">{moneyShort(toCents)}</span>
                      </div>
                      <span className="text-xs font-semibold text-good">
                        ↓ {money(fromCents - toCents)} nos últimos 30 dias
                      </span>
                    </div>
                  </div>
                  <Sparkline
                    values={series}
                    label={`Evolução do preço de ${product.name} nos últimos 30 dias`}
                  />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}
