import type { CatalogProduct } from "@/lib/catalog";
import { mainSiteUrl } from "@/lib/blog/hosts";
import { dropPercent, moneyShort } from "@/lib/format";

/**
 * Cards de produto dentro dos posts. Os dados vêm do catálogo do comparador: menor preço
 * entre as ofertas monitoradas, botão para a oferta mais barata (/go, com clique contado)
 * e link para a comparação completa. Produto sem oferta pública mostra só a comparação.
 */
function Drop({ item, size }: { item: CatalogProduct; size: "sm" | "lg" }) {
  const { lowestCents, previousCents } = item.product.prices;
  const drop = lowestCents !== null && previousCents ? dropPercent(previousCents, lowestCents) : null;
  if (drop === null) return null;
  return (
    <span className={`rounded-md bg-[#E3F8EA] font-bold text-[#15803D] ${size === "lg" ? "px-[7px] py-[3px] text-xs" : "px-1.5 py-0.5 text-[11px]"}`}>
      ↓ {drop}%
    </span>
  );
}

function Photo({ item, className }: { item: CatalogProduct; className: string }) {
  const image = item.product.images[0];
  return (
    <div className={`flex items-center justify-center ${image ? "bg-white" : "blog-stripes"} ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={image.alt} loading="lazy" className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="font-mono text-xs text-blog-muted">sem foto</span>
      )}
    </div>
  );
}

function OfferButton({ item, size }: { item: CatalogProduct; size: "sm" | "lg" }) {
  const best = item.offers[0];
  const classes = `inline-flex w-full items-center justify-center whitespace-nowrap rounded-[10px] bg-blog-accent font-bold text-white transition-colors hover:bg-blog-accent-dark hover:text-white ${
    size === "lg" ? "mt-1 h-11 px-5 text-sm" : "h-9 px-3 text-[13px]"
  }`;
  if (!best) {
    return (
      <a href={mainSiteUrl(`/produto/${item.product.slug}`)} className={classes}>
        Ver produto
      </a>
    );
  }
  const store = item.stores.find((s) => s.id === best.storeId)?.name;
  return (
    <a href={mainSiteUrl(`/go/${best.shortCode}`)} target="_blank" rel="nofollow sponsored noopener" className={classes}>
      {size === "lg" && store ? `Ver oferta na ${store}` : "Ver oferta"}
    </a>
  );
}

/** Um produto sozinho no texto: card largo. */
export function FeaturedProductCard({ item }: { item: CatalogProduct }) {
  const { lowestCents, previousCents, storeCount } = item.product.prices;
  const showPrevious = lowestCents !== null && previousCents !== null && previousCents > lowestCents;
  return (
    <aside className="grid overflow-hidden rounded-[18px] border border-blog-line bg-blog-surface leading-[1.4] sm:grid-cols-[minmax(0,240px)_1fr]">
      <Photo item={item} className="min-h-[220px] p-5" />
      <div className="flex flex-col gap-2.5 p-[22px]">
        {item.product.brand ? <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-blog-muted">{item.product.brand}</span> : null}
        <span className="text-lg font-bold tracking-[-0.02em] text-blog-ink">{item.product.name}</span>
        {lowestCents === null ? (
          <span className="text-sm font-semibold text-blog-muted">Sem ofertas no momento</span>
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            {showPrevious ? <span className="text-sm text-blog-muted line-through">{moneyShort(previousCents!)}</span> : null}
            <span className="text-2xl font-extrabold tracking-[-0.03em] text-blog-ink">{moneyShort(lowestCents)}</span>
            <Drop item={item} size="lg" />
          </div>
        )}
        {storeCount > 1 ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-blog-accent-dark">
            <span className="size-1.5 rounded-full bg-[#22C55E]" aria-hidden />
            Menor preço em {storeCount} lojas
          </span>
        ) : null}
        <OfferButton item={item} size="lg" />
        <a href={mainSiteUrl(`/produto/${item.product.slug}`)} className="text-[13px] font-semibold text-blog-accent-dark hover:text-blog-accent">
          {storeCount > 1 ? `Comparar preços em ${storeCount} lojas` : "Ver histórico de preço"} →
        </a>
        <span className="text-xs text-blog-muted">Preço e disponibilidade podem mudar na loja.</span>
      </div>
    </aside>
  );
}

/** Vários produtos seguidos no texto: grade compacta. */
export function ProductGridCard({ item }: { item: CatalogProduct }) {
  const { lowestCents } = item.product.prices;
  return (
    <aside className="flex flex-col overflow-hidden rounded-[14px] border border-blog-line bg-blog-surface leading-[1.4]">
      <Photo item={item} className="aspect-square p-3" />
      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
        <div className="flex flex-col gap-1.5">
          <span className="line-clamp-3 text-sm font-medium text-blog-ink">{item.product.name}</span>
          {lowestCents === null ? (
            <span className="text-[13px] font-semibold text-blog-muted">Sem ofertas</span>
          ) : (
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-[17px] font-extrabold tracking-[-0.02em] text-blog-ink">{moneyShort(lowestCents)}</span>
              <Drop item={item} size="sm" />
            </div>
          )}
        </div>
        <OfferButton item={item} size="sm" />
      </div>
    </aside>
  );
}

/** Chamada para o alerta de preço do comparador (aparece quando o post cita produtos). */
export function PriceAlertCallout({ productSlug }: { productSlug: string }) {
  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-[18px] bg-blog-accent-soft pl-3.5 pr-5 pt-3.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/capi/watch.png" alt="" className="block h-24 w-auto flex-none self-end" />
      <div className="flex flex-1 flex-col gap-2.5 pb-3.5">
        <span className="text-[15px] font-bold leading-[1.4] text-blog-ink">Quer que a Capi avise quando esses preços caírem?</span>
        <a
          href={mainSiteUrl(`/produto/${productSlug}#alerta`)}
          className="inline-flex h-10 items-center self-start whitespace-nowrap rounded-[10px] border-[1.5px] border-blog-accent bg-white px-[18px] text-sm font-bold text-blog-accent-dark hover:bg-blog-accent hover:text-white"
        >
          🔔 Me avise quando baixar
        </a>
      </div>
    </div>
  );
}
