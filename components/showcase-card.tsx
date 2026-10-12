import Link from "next/link";
import { productHref } from "@/lib/comparison";
import { installmentLabel, money, moneyShort } from "@/lib/format";
import { metricsAreFresh } from "@/lib/discovery/metrics";
import type { StoreDealItem } from "@/lib/catalog";
import { ProductImage } from "./photo";
import { DropBadge } from "./price";
import { Sparkline } from "./price-history";

const shortDate = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);
const compact = (n: number) => (n >= 1_000 ? `${(n / 1_000).toFixed(1).replace(".", ",").replace(",0", "")} mil` : String(n));

/**
 * Número de venda e nota é da LOJA, não nosso: sempre com fonte e data, e some quando tem mais de
 * 30 dias (vira ausência, nunca número velho).
 */
export function storeMetricsLine(deal: StoreDealItem, storeName: string, now = new Date()): string | null {
  if (!metricsAreFresh(deal.metricsCheckedAt, now) || !deal.metricsCheckedAt) return null;
  const parts: string[] = [];
  if (deal.ratingCentis !== null) parts.push(`nota ${(deal.ratingCentis / 100).toFixed(1).replace(".", ",")}`);
  if (deal.salesCount !== null && deal.salesCount > 0) parts.push(`${compact(deal.salesCount)} vendidos`);
  return parts.length ? `${parts.join(" · ")} segundo a ${storeName}, em ${shortDate(deal.metricsCheckedAt)}` : null;
}

/**
 * Card das vitrines. Só dado lastreado: preço riscado só quando a loja declara, "menor preço" e
 * "abaixo da média" só com o histórico exigido, frete e parcelamento só quando a loja informa.
 * O CTA é sempre /go/{código}: nunca a URL crua da loja.
 */
export function ShowcaseCard({ deal, reason, storeName }: { deal: StoreDealItem; reason?: string; storeName: string }) {
  const { product, offer } = deal;
  const metrics = storeMetricsLine(deal, storeName);
  const installments = installmentLabel(offer.installmentPriceCents ?? offer.priceCents, offer.installments);

  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
      <ProductImage product={product} className="aspect-square" />

      <div className="flex flex-1 flex-col gap-1.5">
        {product.brand ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{product.brand}</span>
        ) : null}
        <h3 className="text-sm font-semibold leading-snug text-pretty">
          <Link href={productHref(product)} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        {reason ? <p className="text-xs font-semibold text-good">{reason}</p> : null}
        {metrics ? <p className="text-xs text-muted">{metrics}</p> : null}
      </div>

      {deal.series.length >= 2 ? (
        <div className="w-full max-w-[160px]">
          <Sparkline values={deal.series} label={`Histórico de preço de 30 dias na ${storeName}`} />
        </div>
      ) : null}

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted">Na {storeName}</span>
        {offer.previousPriceCents && offer.previousPriceCents > offer.priceCents ? (
          <span className="text-xs text-muted line-through">{money(offer.previousPriceCents)}</span>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-[-0.03em]">{moneyShort(offer.priceCents)}</span>
          <DropBadge from={offer.previousPriceCents} to={offer.priceCents} />
        </div>
        {installments ? <span className="text-xs text-muted">{installments}</span> : null}
        {offer.shipping.kind === "gratis" ? <span className="text-xs text-good">Frete grátis</span> : null}
        {deal.otherStores > 0 && deal.cheapestOtherCents !== null ? (
          <Link href={productHref(product)} className="mt-1 text-xs text-muted underline hover:text-brand">
            também em {deal.otherStores} {deal.otherStores === 1 ? "outra loja" : "outras lojas"}, a partir de {moneyShort(deal.cheapestOtherCents)}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={`/go/${offer.shortCode}`}
          rel="sponsored nofollow noopener"
          target="_blank"
          aria-label={`Ver oferta de ${product.name} na ${storeName}`}
          className="flex h-10 items-center justify-center rounded-[9px] bg-brand text-sm font-semibold text-surface transition-colors hover:bg-brand-dark"
        >
          Ver na {storeName}
        </a>
        <Link href={`${productHref(product)}#alerta`} className="text-center text-xs font-semibold text-brand hover:text-brand-dark">
          Avisar quando baixar
        </Link>
      </div>
    </article>
  );
}

export function ShowcaseGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">{children}</div>;
}
