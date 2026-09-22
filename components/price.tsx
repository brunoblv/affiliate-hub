import { type Cents, dropPercent, elapsed, money } from "@/lib/format";
import { ArrowDownIcon } from "./icons";

export function DropBadge({ from, to }: { from?: Cents | null; to?: Cents | null }) {
  if (from == null || to == null) return null;
  const percent = dropPercent(from, to);
  if (percent === null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-good-bg px-1.5 py-[3px] text-[11px] font-bold text-good">
      <ArrowDownIcon /> {percent}%
    </span>
  );
}

/**
 * The lowest price always travels with the qualifier: we only claim the lowest
 * among the offers we monitor, never the lowest on the internet (RF-03).
 */
export function LowestPriceLabel({ className = "" }: { className?: string }) {
  return (
    <span className={`text-xs text-muted ${className}`}>Menor preço entre as ofertas monitoradas</span>
  );
}

export function PriceUpdated({ minutesAgo }: { minutesAgo: number | null }) {
  if (minutesAgo === null) {
    return <span className="text-xs text-warn-ink">Sem ofertas atualizadas</span>;
  }
  return <span className="text-xs text-muted">Preço atualizado há {elapsed(minutesAgo)}</span>;
}

export function NoPrice({ className = "" }: { className?: string }) {
  return (
    <span className={`text-lg font-bold text-muted ${className}`}>Sem ofertas atuais</span>
  );
}

export function Price({
  cents,
  className = "",
}: {
  cents: Cents | null;
  className?: string;
}) {
  if (cents === null) return <NoPrice className={className} />;
  return <span className={className}>{money(cents)}</span>;
}
