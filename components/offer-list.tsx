"use client";

import { useState } from "react";
import { elapsed, installmentLabel, isStale, money } from "@/lib/format";
import type { Offer, Store } from "@/lib/types";

export interface OfferGroup {
  store: Store;
  offers: Offer[];
}

/**
 * The comparison itself. Offers are grouped by store so the list stays readable,
 * but every seller remains reachable — collapsing must never hide a competing
 * price (RF-11). On narrow screens each row becomes a card instead of scrolling
 * sideways.
 */
export function OfferList({
  groups,
  bestOfferId,
  expandedByDefault = false,
}: {
  groups: OfferGroup[];
  bestOfferId: string | null;
  expandedByDefault?: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (storeId: string) => open[storeId] ?? expandedByDefault;
  const toggle = (storeId: string) =>
    setOpen((current) => ({ ...current, [storeId]: !isOpen(storeId) }));

  return (
    <div className="flex flex-col gap-2.5">
      {groups.map(({ store, offers }) => {
        const [lead, ...extras] = offers;
        const isBest = lead.id === bestOfferId;
        const expanded = isOpen(store.id);

        return (
          <article
            key={store.id}
            className={`flex flex-col gap-3.5 rounded-[14px] border bg-surface p-4 sm:px-5 ${
              isBest ? "border-good" : "border-line"
            }`}
          >
            <OfferRow offer={lead} store={store} best={isBest} />

            {extras.length > 0 ? (
              <div className="flex flex-col gap-2.5 border-t border-line pt-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13px] text-muted">
                    <strong className="text-ink">{offers.length} ofertas disponíveis</strong> nesta
                    loja
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(store.id)}
                    aria-expanded={expanded}
                    aria-controls={`extras-${store.id}`}
                    className="rounded-lg border border-line bg-surface px-3 py-[7px] text-xs font-semibold text-brand transition-colors hover:border-brand"
                  >
                    {expanded
                      ? "Ocultar ofertas"
                      : `Ver +${extras.length} ${extras.length === 1 ? "oferta" : "ofertas"}`}
                  </button>
                </div>

                <ul id={`extras-${store.id}`} hidden={!expanded} className="flex flex-col gap-2">
                  {extras.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-[10px] bg-canvas px-3.5 py-2.5"
                    >
                      <span className="min-w-0 flex-1 text-[13px]">{offer.seller}</span>
                      <span className="text-[15px] font-bold">{money(offer.priceCents)}</span>
                      <OfferLink offer={offer} subtle />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function OfferRow({ offer, store, best }: { offer: Offer; store: Store; best: boolean }) {
  const unavailable = offer.availability === "sem_estoque";
  const installmentText = installmentLabel(offer.installmentPriceCents ?? offer.priceCents, offer.installments);
  const failed = offer.status === "erro";
  const stale = isStale(offer.collectedMinutesAgo, offer.method);

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${unavailable || failed ? "opacity-60" : ""}`}>
      <div className="flex h-[38px] w-[104px] flex-none items-center justify-center rounded-lg border border-line bg-surface">
        <span className="px-1 text-center text-[11px] font-bold leading-tight">{store.name}</span>
      </div>

      <div className="flex min-w-[140px] flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold">{store.name}</span>
          {best ? (
            <span className="rounded-[5px] bg-good px-1.5 py-[3px] text-[10px] font-bold tracking-[0.06em] text-surface">
              MENOR PREÇO
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted">Vendido por {offer.seller}</span>
        <span className={`text-xs ${offer.shipping.kind === "gratis" ? "text-good" : "text-muted"}`}>
          {offer.shipping.label}
        </span>
      </div>

      <div className="flex min-w-[140px] flex-none flex-col gap-0.5 sm:text-right">
        <span className="text-[11px] text-muted">À vista</span>
        <span
          className={`text-[26px] font-extrabold tracking-[-0.03em] ${
            unavailable ? "text-muted line-through" : ""
          }`}
        >
          {money(offer.priceCents)}
        </span>
        {offer.priceCondition ? <span className="text-[11px] text-muted">{offer.priceCondition}</span> : null}
        {installmentText ? <span className="text-xs text-muted">ou {installmentText}</span> : null}
        {!stale && !failed && !unavailable ? (
          <span className="text-[11px] text-muted">
            Coletado há {elapsed(offer.collectedMinutesAgo)}
          </span>
        ) : null}
      </div>

      {unavailable || failed ? (
        <span className="flex h-11 flex-none items-center rounded-[9px] border border-line px-4 text-[13px] font-semibold text-muted">
          {unavailable ? "Sem estoque" : "Indisponível"}
        </span>
      ) : (
        <OfferLink offer={offer} highlighted={best} />
      )}
    </div>
  );
}

function OfferLink({
  offer,
  highlighted = false,
  subtle = false,
}: {
  offer: Offer;
  highlighted?: boolean;
  subtle?: boolean;
}) {
  const label = `Ver oferta de ${offer.seller} por ${money(offer.priceCents)}`;

  if (subtle) {
    return (
      <a
        href={`/go/${offer.shortCode}`}
        rel="sponsored nofollow noopener"
        target="_blank"
        aria-label={label}
        className="text-xs font-semibold text-brand hover:text-brand-dark"
      >
        Ver oferta →
      </a>
    );
  }

  return (
    <a
      href={`/go/${offer.shortCode}`}
      rel="sponsored nofollow noopener"
      target="_blank"
      aria-label={label}
      className={`flex h-11 flex-none items-center whitespace-nowrap rounded-[9px] border px-5 text-sm font-semibold transition-colors ${
        highlighted
          ? "border-brand bg-brand text-surface hover:bg-brand-dark"
          : "border-line bg-surface text-brand hover:border-brand"
      }`}
    >
      Ver oferta →
    </a>
  );
}
