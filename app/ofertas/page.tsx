import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductImage } from "@/components/photo";
import { DropBadge } from "@/components/price";
import { DEAL_KINDS, listDeals, listNiches, listStores, type DealKind } from "@/lib/catalog";
import { elapsed, integer, moneyShort } from "@/lib/format";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Produtos com queda de preço entre as ofertas que monitoramos.",
};

const EMPTY: Record<DealKind, string> = {
  destaque: "Ainda não há produtos com oferta atual.",
  quedas: "Nenhuma queda de preço registrada nos últimos 30 dias.",
  minima: "Ainda não há produtos no menor preço registrado. Esse recorte precisa de histórico.",
  novas: "Ainda não há ofertas novas.",
};

export default async function DealsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const kind = DEAL_KINDS.find((item) => item.slug === asText(params.recorte))?.slug ?? "destaque";

  const [deals, niches, stores] = await Promise.all([listDeals(kind), listNiches(), listStores()]);

  return (
    <>
      <SiteHeader />

      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 pt-9 sm:px-8">
        <h1 className="text-[34px] font-extrabold tracking-[-0.035em]">Ofertas</h1>
        <p className="mt-2.5 text-[15px] text-muted">
          {integer(deals.length)} {deals.length === 1 ? "produto" : "produtos"} neste recorte, entre as
          ofertas monitoradas.
        </p>

        <nav aria-label="Recortes de ofertas" className="mt-7 flex flex-wrap gap-2.5">
          {DEAL_KINDS.map((tab) => (
            <Link
              key={tab.slug}
              href={tab.slug === "destaque" ? "/ofertas" : `/ofertas?recorte=${tab.slug}`}
              aria-current={tab.slug === kind ? "page" : undefined}
              className={`rounded-[9px] px-4 py-2.5 text-[13px] font-semibold ${
                tab.slug === kind
                  ? "bg-brand text-surface"
                  : "border border-line bg-surface text-ink hover:border-brand"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <form
          method="get"
          action="/busca"
          className="flex flex-wrap gap-2.5 border-b border-line pb-7 pt-3.5"
        >
          <label className="sr-only" htmlFor="filtro-categoria">
            Nicho
          </label>
          <select
            id="filtro-categoria"
            name="categoria"
            className="h-[38px] rounded-[9px] border border-line bg-surface px-2.5 text-[13px] font-medium outline-none focus:border-brand"
          >
            <option value="">Todos os nichos</option>
            {niches.map((niche) => (
              <option key={niche.slug} value={niche.slug}>
                {niche.name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filtro-loja">
            Loja
          </label>
          <select
            id="filtro-loja"
            name="loja"
            className="h-[38px] rounded-[9px] border border-line bg-surface px-2.5 text-[13px] font-medium outline-none focus:border-brand"
          >
            <option value="">Todas as lojas</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="h-[38px] rounded-[9px] border border-line bg-surface px-4 text-[13px] font-semibold transition-colors hover:border-brand hover:text-brand"
          >
            Filtrar
          </button>
        </form>

        {deals.length === 0 ? (
          <p className="mt-7 rounded-[14px] border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            {EMPTY[kind]}
          </p>
        ) : (
          <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
            {deals.map((product) => {
              const { lowestCents, previousCents, storeCount, freshestMinutesAgo } = product.prices;

              return (
                <Link
                  key={product.slug}
                  href={`/produto/${product.slug}`}
                  className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-brand"
                >
                  <div className="flex gap-3.5">
                    <ProductImage product={product} className="h-[86px] w-[86px] flex-none" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[13px] font-semibold leading-tight text-pretty">
                        {product.name}
                      </span>
                      {previousCents && lowestCents && previousCents > lowestCents ? (
                        <span className="text-xs text-muted line-through">{moneyShort(previousCents)}</span>
                      ) : null}
                      {lowestCents === null ? (
                        <span className="text-sm font-semibold text-muted">Sem ofertas atuais</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[22px] font-extrabold tracking-[-0.035em]">
                            {moneyShort(lowestCents)}
                          </span>
                          <DropBadge from={previousCents} to={lowestCents} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line-soft pt-2.5 text-xs text-muted">
                    <span>{storeCount} {storeCount === 1 ? "loja" : "lojas"}</span>
                    <span>
                      {freshestMinutesAgo === null ? "sem atualização" : `há ${elapsed(freshestMinutesAgo)}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
