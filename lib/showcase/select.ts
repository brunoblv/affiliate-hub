import { metricsAreFresh } from "@/lib/discovery/metrics";
import type { ShowcaseItem } from "./types";

/**
 * Critérios de entrada de cada recorte da vitrine (B.3). Funções puras: tudo que justifica uma
 * entrada vem de dado observado, e o motivo textual descreve exatamente o critério que valeu.
 */
export type Kind = "ACHADOS" | "MAIS_VENDIDOS" | "MELHORES_OFERTAS" | "NOVIDADES";

export const SHOWCASE_LIMIT = 12;
export const SHOWCASE_MIN_VISIBLE = 4;
export const NOVELTY_DAYS = 7;
const MIN_ACHADO_BELOW_AVERAGE = 15;
const MIN_ACHADO_DROP_7D = 20;
const MIN_ACHADO_RATING_CENTIS = 460;
const MIN_ACHADO_SALES = 500;
const MIN_ACHADO_DECLARED_DISCOUNT = 25;

export interface Entry {
  item: ShowcaseItem;
  reason: string;
}

const decimal = (n: number) => n.toFixed(1).replace(".", ",");
const compact = (n: number) => (n >= 1_000 ? `${decimal(n / 1_000)} mil`.replace(",0 ", " ") : String(n));
const shortDate = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);

export function declaredDiscountPct(item: ShowcaseItem): number | null {
  const previous = item.declaredPreviousCents;
  return previous && previous > item.priceCents ? Math.round(((previous - item.priceCents) / previous) * 100) : null;
}

/** Prioridade (menor = mais forte) e motivo; null quando não entra em Achados. */
export function achadoCriterion(item: ShowcaseItem, now: Date): { priority: number; strength: number; reason: string } | null {
  if (item.atMinimum) return { priority: 1, strength: 0, reason: "Menor preço em 30 dias" };
  const below = item.differenceFromAveragePct;
  if (below !== null && below <= -MIN_ACHADO_BELOW_AVERAGE) {
    return { priority: 2, strength: below, reason: `${Math.abs(Math.round(below))}% abaixo da média de 30 dias` };
  }
  if (item.drop7dPct !== null && item.drop7dPct >= MIN_ACHADO_DROP_7D) {
    return { priority: 3, strength: -item.drop7dPct, reason: `Caiu ${Math.round(item.drop7dPct)}% em 7 dias` };
  }
  const discount = declaredDiscountPct(item);
  if (
    discount !== null && discount >= MIN_ACHADO_DECLARED_DISCOUNT &&
    item.ratingCentis !== null && item.ratingCentis >= MIN_ACHADO_RATING_CENTIS &&
    item.salesCount !== null && item.salesCount >= MIN_ACHADO_SALES &&
    metricsAreFresh(item.metricsCheckedAt, now)
  ) {
    return {
      priority: 4,
      strength: -discount,
      reason: `Nota ${decimal(item.ratingCentis / 100)} · ${compact(item.salesCount)} vendidos · ${discount}% de desconto declarado pela loja`,
    };
  }
  return null;
}

export function pickEntries(kind: Kind, items: ShowcaseItem[], context: { storeName: string; now: Date }): Entry[] {
  const { now, storeName } = context;
  let entries: Entry[] = [];

  if (kind === "ACHADOS") {
    entries = items
      .flatMap((item) => {
        const criterion = achadoCriterion(item, now);
        return criterion ? [{ item, reason: criterion.reason, criterion }] : [];
      })
      .sort((a, b) => a.criterion.priority - b.criterion.priority || a.criterion.strength - b.criterion.strength)
      .map(({ item, reason }) => ({ item, reason }));
  } else if (kind === "MAIS_VENDIDOS") {
    entries = items
      .filter((item) => item.salesCount !== null && item.salesCount > 0 && metricsAreFresh(item.metricsCheckedAt, now))
      .sort((a, b) => b.salesCount! - a.salesCount!)
      .map((item) => ({
        item,
        reason: `${compact(item.salesCount!)} vendidos segundo a ${storeName}, em ${shortDate(item.metricsCheckedAt!)}`,
      }));
  } else if (kind === "MELHORES_OFERTAS") {
    entries = items
      .filter((item) => item.atMinimum || item.assessment === "low")
      .sort(
        (a, b) =>
          Number(b.atMinimum) - Number(a.atMinimum) ||
          (a.differenceFromAveragePct ?? 0) - (b.differenceFromAveragePct ?? 0),
      )
      .map((item) => ({
        item,
        reason: item.atMinimum
          ? "Menor preço em 30 dias"
          : `${Math.abs(Math.round(item.differenceFromAveragePct ?? 0))}% abaixo da média de 30 dias`,
      }));
  } else {
    const since = now.getTime() - NOVELTY_DAYS * 86_400_000;
    entries = items
      .filter((item) => item.offerCreatedAt.getTime() >= since)
      .sort((a, b) => b.offerCreatedAt.getTime() - a.offerCreatedAt.getTime())
      .map((item) => ({ item, reason: `Entrou no catálogo em ${shortDate(item.offerCreatedAt)}` }));
  }
  return entries.slice(0, SHOWCASE_LIMIT);
}

/**
 * Reconferência na renderização: a entrada congelada só vale se a oferta continua elegível e o
 * preço não subiu acima do que a justificou.
 */
export function stillValid(entry: { offerId: string; priceCents: number }, live: Map<string, { priceCents: number }>): boolean {
  const current = live.get(entry.offerId);
  return current !== undefined && current.priceCents <= entry.priceCents;
}
