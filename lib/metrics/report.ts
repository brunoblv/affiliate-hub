export const METRIC_DAYS = [7, 30, 90] as const;
export function metricRange(raw: string | undefined, now = new Date()) {
  const days = METRIC_DAYS.find((value) => String(value) === raw) ?? 30;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const midnight = new Date(`${today}T00:00:00-03:00`);
  const start = new Date(midnight.getTime() - (days - 1) * 86400000);
  return { days, start, end: now };
}

export type DailyMetric = { day: string; kind: string; count: number };
export function fillMetricDays(start: Date, days: number, rows: DailyMetric[]) {
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10);
    const count = (kind: string) => rows.find((row) => row.day === day && row.kind === kind)?.count ?? 0;
    return { day, searches: count("SEARCH"), noResults: count("NO_RESULTS"), views: count("PRODUCT_VIEW"), offers: count("OFFER_CLICK"), communities: count("COMMUNITY_CLICK") };
  });
}
export function noResultRate(searches: number, empty: number): string {
  return searches ? `${(100 * empty / searches).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
}
