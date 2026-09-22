import Link from "next/link";
import { integer, moneyShort } from "@/lib/format";
import type { Product } from "@/lib/types";
import { DropBadge } from "./price";
import { ProductImage } from "./photo";

/**
 * The grid card used on the home page, category pages and related lists.
 * "A partir de" appears whenever the product has more than one variant (RF-03).
 */
export function ProductCard({ product, showBrand = true }: { product: Product; showBrand?: boolean }) {
  const { lowestCents, previousCents, storeCount } = product.prices;
  const multiVariant = product.variants.length > 1;

  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
      <ProductImage product={product} className="aspect-square" />

      <div className="flex flex-1 flex-col gap-1.5">
        {showBrand && product.brand ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {product.brand}
          </span>
        ) : null}
        <h3 className="text-sm font-semibold leading-snug text-pretty">
          <Link href={`/produto/${product.slug}`} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        {product.rating !== null && product.reviewCount !== null ? (
          <span className="text-xs text-muted">
            ★ {product.rating.toFixed(1).replace(".", ",")} · {integer(product.reviewCount)} avaliações
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted">{multiVariant ? "A partir de" : "Menor preço"}</span>
        {lowestCents === null ? (
          <span className="text-base font-bold text-muted">Sem ofertas atuais</span>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-[-0.03em]">
                {moneyShort(lowestCents)}
              </span>
              <DropBadge from={previousCents} to={lowestCents} />
            </div>
            <span className="text-xs text-muted">
              em <strong className="text-ink">{storeCount} lojas</strong>
            </span>
          </>
        )}
      </div>

      <Link
        href={`/produto/${product.slug}`}
        className="flex h-10 items-center justify-center rounded-[9px] bg-brand text-sm font-semibold text-surface transition-colors hover:bg-brand-dark"
      >
        Comparar preços
      </Link>
    </article>
  );
}

/** Compact variant for dense grids (category sections, related products). */
export function ProductTile({ product }: { product: Product }) {
  const { lowestCents, previousCents, storeCount } = product.prices;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-brand"
    >
      <ProductImage product={product} className="aspect-square" rounded="rounded-[9px]" />
      <span className="text-[13px] font-semibold leading-snug">{product.name}</span>
      {lowestCents === null ? (
        <span className="text-[13px] font-semibold text-muted">Sem ofertas atuais</span>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-[19px] font-extrabold tracking-[-0.03em]">
              {moneyShort(lowestCents)}
            </span>
            <DropBadge from={previousCents} to={lowestCents} />
          </div>
          <span className="text-xs text-muted">{storeCount} lojas</span>
        </>
      )}
    </Link>
  );
}
