import type { CatalogProduct } from "@/lib/catalog";
import { mainSiteUrl } from "@/lib/blog/hosts";
import { dropPercent, moneyShort } from "@/lib/format";

/**
 * Cards de produto dentro dos posts. Os dados vêm do catálogo do comparador: menor preço
 * entre as ofertas monitoradas, botão para a oferta mais barata (/go, com clique contado)
 * e link para a comparação completa. Produto sem oferta pública mostra só a comparação.
 */
function Price({ item }: { item: CatalogProduct }) {
  const { lowestCents, previousCents } = item.product.prices;
  if (lowestCents === null) return <span className="text-sm font-semibold text-blog-muted">Sem ofertas no momento</span>;
  const drop = previousCents ? dropPercent(previousCents, lowestCents) : null;
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {drop !== null && previousCents ? <span className="text-sm text-blog-muted line-through">{moneyShort(previousCents)}</span> : null}
      <span className="text-xl font-bold text-blog-ink">{moneyShort(lowestCents)}</span>
      {drop !== null ? (
        <span className="rounded-full bg-blog-accent px-2 py-0.5 text-xs font-bold text-blog-accent-ink">-{drop}%</span>
      ) : null}
    </div>
  );
}

function Photo({ item, className }: { item: CatalogProduct; className: string }) {
  const image = item.product.images[0];
  return (
    <div className={`blog-stripes flex items-center justify-center ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={image.alt} loading="lazy" className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="font-mono text-xs text-blog-muted">sem imagem</span>
      )}
    </div>
  );
}

function OfferButton({ item, size }: { item: CatalogProduct; size: "sm" | "lg" }) {
  const best = item.offers[0];
  const classes = `inline-flex w-full items-center justify-center rounded-lg bg-blog-accent font-semibold text-blog-accent-ink transition-colors hover:bg-blog-accent-dark ${
    size === "lg" ? "h-11 px-5 text-sm" : "h-9 px-3 text-[13px]"
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
      {store ? `Ver oferta na ${store}` : "Ver oferta"}
    </a>
  );
}

function CompareLink({ item }: { item: CatalogProduct }) {
  const stores = item.product.prices.storeCount;
  return (
    <a href={mainSiteUrl(`/produto/${item.product.slug}`)} className="text-[13px] font-semibold text-blog-accent-dark underline-offset-2 hover:underline">
      {stores > 1 ? `Comparar preços em ${stores} lojas` : "Ver histórico de preço"} →
    </a>
  );
}

/** Um produto sozinho no texto: card largo. */
export function FeaturedProductCard({ item }: { item: CatalogProduct }) {
  return (
    <aside className="overflow-hidden rounded-xl border border-blog-line bg-blog-surface">
      <div className="grid sm:grid-cols-[minmax(0,240px)_1fr]">
        <Photo item={item} className="aspect-square p-4 sm:aspect-auto sm:min-h-56" />
        <div className="flex flex-col justify-center gap-3 p-5">
          {item.product.brand ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blog-muted">{item.product.brand}</p>
          ) : null}
          <h3 className="font-blog-heading text-lg font-semibold leading-snug text-blog-ink">{item.product.name}</h3>
          <Price item={item} />
          <div className="pt-1">
            <OfferButton item={item} size="lg" />
          </div>
          <CompareLink item={item} />
          <p className="text-xs text-blog-muted">Preço e disponibilidade podem mudar na loja.</p>
        </div>
      </div>
    </aside>
  );
}

/** Vários produtos seguidos no texto: grade compacta. */
export function ProductGridCard({ item }: { item: CatalogProduct }) {
  return (
    <aside className="flex flex-col overflow-hidden rounded-xl border border-blog-line bg-blog-surface">
      <Photo item={item} className="aspect-square p-3" />
      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="line-clamp-3 text-sm font-medium leading-snug text-blog-ink">{item.product.name}</h3>
          <Price item={item} />
        </div>
        <OfferButton item={item} size="sm" />
      </div>
    </aside>
  );
}
