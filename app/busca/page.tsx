import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SearchFilters } from "@/components/search-filters";
import { NoResults } from "@/components/states";
import { DropBadge } from "@/components/price";
import { ProductImage } from "@/components/photo";
import { listNiches, listStores, searchProducts } from "@/lib/catalog";
import { elapsed, installmentLabel, integer, money } from "@/lib/format";
import { asCents, asList, asText, buildHref, hrefWithout, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Busca",
  // Filter permutations must not be indexed (§12).
  robots: { index: false, follow: true },
};

const SORTS = [
  { value: "relevancia", label: "Mais relevantes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "atualizacao", label: "Atualização recente" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const term = asText(params.q);
  const sort = (asText(params.ordenar) || "relevancia") as Sort;

  const page = Number.parseInt(asText(params.pagina), 10) || 1;
  const [niches, stores, results] = await Promise.all([
    listNiches(),
    listStores(),
    searchProducts({
      term,
      brands: asList(params.marca),
      storeIds: asList(params.loja),
      minCents: asCents(params.min),
      maxCents: asCents(params.max),
      availableOnly: asText(params.disponivel) === "1",
      sort: SORTS.some((option) => option.value === sort) ? sort : "relevancia",
      nicheSlug: asList(params.categoria)[0],
      page,
    }),
  ]);

  const chips = [
    ...asList(params.categoria).map((slug) => ({
      key: `categoria-${slug}`,
      label: niches.find((niche) => niche.slug === slug)?.name ?? slug,
      href: hrefWithout("/busca", params, "categoria", slug),
    })),
    ...asList(params.marca).map((brand) => ({
      key: `marca-${brand}`,
      label: brand,
      href: hrefWithout("/busca", params, "marca", brand),
    })),
    ...asList(params.loja).map((storeId) => ({
      key: `loja-${storeId}`,
      label: stores.find((store) => store.id === storeId)?.name ?? storeId,
      href: hrefWithout("/busca", params, "loja", storeId),
    })),
    ...(asText(params.disponivel) === "1"
      ? [{ key: "disponivel", label: "Somente com oferta atual", href: hrefWithout("/busca", params, "disponivel") }]
      : []),
  ];

  return (
    <>
      <SiteHeader term={term} />

      <main
        id="conteudo"
        className="mx-auto grid max-w-[1280px] items-start gap-7 px-4 pb-24 pt-6 sm:px-8 lg:grid-cols-[248px_minmax(0,1fr)]"
      >
        {/* Desktop: permanent sidebar. Mobile: a drawer that does not need JS. */}
        <details className="rounded-[14px] border border-line bg-surface lg:hidden">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold">
            Filtros {chips.length > 0 ? `· ${chips.length}` : ""}
          </summary>
          <div className="border-t border-line">
            <SearchFilters params={params} />
          </div>
        </details>

        <aside className="hidden lg:block">
          <SearchFilters params={params} />
        </aside>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-[26px] font-bold tracking-[-0.03em]">
                {term ? <>Resultados para “{term}”</> : "Todos os produtos"}
              </h1>
              <p className="text-[13px] text-muted">
                {integer(results.total)}{" "}
                {results.total === 1 ? "produto encontrado" : "produtos encontrados"}
              </p>
            </div>

            <form method="get" action="/busca" className="flex items-center gap-2">
              {Object.entries(params).flatMap(([key, value]) =>
                key === "ordenar" || key === "pagina"
                  ? []
                  : asList(value).map((item, index) => (
                      <input key={`${key}-${index}`} type="hidden" name={key} value={item} />
                    )),
              )}
              <label htmlFor="ordenar" className="text-[13px] text-muted">
                Ordenar por
              </label>
              <select
                id="ordenar"
                name="ordenar"
                defaultValue={sort}
                className="h-[38px] rounded-[9px] border border-line bg-surface px-2.5 text-[13px] font-medium outline-none focus:border-brand"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-[38px] rounded-[9px] border border-line bg-surface px-3 text-[13px] font-semibold transition-colors hover:border-brand hover:text-brand"
              >
                Aplicar
              </button>
            </form>
          </div>

          {chips.length > 0 ? (
            <ul aria-label="Filtros aplicados" className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <Link
                    href={chip.href}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-brand hover:text-brand"
                  >
                    {chip.label}
                    <span aria-hidden>×</span>
                    <span className="sr-only">Remover filtro</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {results.products.length === 0 ? (
            <NoResults term={term || "sua busca"} clearHref={buildHref("/busca", { q: term })} />
          ) : (
            results.products.map((product) => {
              const { lowestCents, previousCents, storeCount, freshestMinutesAgo } = product.prices;

              return (
                <article
                  key={product.slug}
                  className="flex flex-col gap-5 rounded-[14px] border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong sm:flex-row"
                >
                  <ProductImage product={product} className="h-[148px] w-[148px] flex-none" />

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <h2 className="text-lg font-bold tracking-[-0.02em]">
                      <Link href={`/produto/${product.slug}`} className="hover:text-brand">
                        {product.name}
                      </Link>
                    </h2>
                    {product.rating !== null && product.reviewCount !== null ? (
                      <span className="text-[13px] text-muted">
                        ★ {product.rating.toFixed(1).replace(".", ",")} ·{" "}
                        {integer(product.reviewCount)} avaliações
                      </span>
                    ) : null}
                    <ul className="mt-0.5 flex flex-wrap gap-1.5">
                      {product.specs
                        .filter((spec) => spec.value !== null)
                        .slice(0, 3)
                        .map((spec) => (
                          <li
                            key={spec.key}
                            className="rounded-md border border-line bg-canvas px-2 py-[3px] text-xs text-muted"
                          >
                            {spec.value}
                          </li>
                        ))}
                    </ul>
                    <p className="mt-auto text-[13px] text-muted">
                      Disponível em <strong className="text-ink">{storeCount} lojas</strong>
                      {freshestMinutesAgo !== null
                        ? ` · atualizado há ${elapsed(freshestMinutesAgo)}`
                        : " · sem ofertas atualizadas"}
                    </p>
                  </div>

                  <div className="flex w-full flex-none flex-col gap-1 border-line pt-4 sm:w-[220px] sm:border-l sm:pl-5 sm:pt-0">
                    <span className="text-xs text-muted">Menor preço monitorado</span>
                    {lowestCents === null ? (
                      <span className="text-lg font-bold text-muted">Sem ofertas atuais</span>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[28px] font-extrabold tracking-[-0.035em]">
                            {money(lowestCents)}
                          </span>
                          <DropBadge from={previousCents} to={lowestCents} />
                        </div>
                        {product.prices.priceCondition ? (
                          <span className="text-xs text-muted">{product.prices.priceCondition}</span>
                        ) : null}
                        {installmentLabel(product.prices.installmentTotalCents, product.prices.installmentTimes) ? (
                          <span className="text-xs text-muted">
                            ou {installmentLabel(product.prices.installmentTotalCents, product.prices.installmentTimes)}
                          </span>
                        ) : null}
                      </>
                    )}

                    <Link
                      href={`/produto/${product.slug}`}
                      className="mt-3.5 flex h-[42px] items-center justify-center rounded-[9px] bg-brand text-sm font-semibold text-surface transition-colors hover:bg-brand-dark"
                    >
                      Comparar preços
                    </Link>
                  </div>
                </article>
              );
            })
          )}

          {results.pageCount > 1 ? (
            <nav aria-label="Paginação" className="flex items-center justify-between gap-4 pt-2 text-[13px]">
              {results.page > 1 ? (
                <Link
                  href={buildHref("/busca", { ...params, pagina: String(results.page - 1) })}
                  className="rounded-[9px] border border-line bg-surface px-4 py-2 font-semibold hover:border-brand hover:text-brand"
                >
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Página {results.page} de {results.pageCount}
              </span>
              {results.page < results.pageCount ? (
                <Link
                  href={buildHref("/busca", { ...params, pagina: String(results.page + 1) })}
                  className="rounded-[9px] border border-line bg-surface px-4 py-2 font-semibold hover:border-brand hover:text-brand"
                >
                  Próxima →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
