import type { Tier } from "./brand";

/**
 * Seleção da rodada (A.6): maior pontuação primeiro, com cota mínima de marca, teto de
 * genéricos e teto por grupo (nicho) para uma categoria não dominar a leva. Função pura.
 */
export interface Selectable {
  score: number;
  tier: Tier;
  /** Nicho/categoria/pauta, para o teto por grupo. */
  group: string;
  /** Fonte, para respeitar a cota por fonte. */
  source: string;
}

export interface SelectionOptions {
  total: number;
  brandedMinPct: number;
  genericMaxPct: number;
  perGroup: number;
  /** Limite por fonte (ex.: 25 Shopee + 25 AliExpress). Fonte ausente = sem limite próprio. */
  perSource?: Record<string, number>;
}

export function selectForImport<T extends Selectable>(candidates: T[], options: SelectionOptions): T[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const picked = new Set<T>();
  const groups = new Map<string, number>();
  const sources = new Map<string, number>();
  const counts: Record<Tier, number> = { BRANDED: 0, GENERIC: 0, UNKNOWN: 0 };
  const genericCap = Math.floor((options.total * options.genericMaxPct) / 100);
  const brandedGoal = Math.ceil((options.total * options.brandedMinPct) / 100);

  const take = (item: T) => {
    if (picked.size >= options.total || picked.has(item)) return;
    if ((groups.get(item.group) ?? 0) >= options.perGroup) return;
    const sourceCap = options.perSource?.[item.source];
    if (sourceCap !== undefined && (sources.get(item.source) ?? 0) >= sourceCap) return;
    if (item.tier === "GENERIC" && counts.GENERIC >= genericCap) return;
    picked.add(item);
    groups.set(item.group, (groups.get(item.group) ?? 0) + 1);
    sources.set(item.source, (sources.get(item.source) ?? 0) + 1);
    counts[item.tier]++;
  };

  // 1ª passada: garante o mínimo de marca. 2ª: completa pela pontuação, respeitando o teto de genéricos.
  for (const item of sorted) {
    if (counts.BRANDED >= brandedGoal) break;
    if (item.tier === "BRANDED") take(item);
  }
  for (const item of sorted) take(item);
  return sorted.filter((item) => picked.has(item));
}
