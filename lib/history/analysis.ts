import type { Cents } from "@/lib/format";

export interface Observation {
  t: number;
  cents: Cents;
}

export type PriceAssessment = "insufficient" | "low" | "normal" | "high";

export interface HistoryAnalysis {
  observations: Observation[];
  observedDays: number;
  firstAt: number | null;
  lastAt: number | null;
  lowest: Cents | null;
  highest: Cents | null;
  average: Cents | null;
  changePercent: number | null;
  assessment: PriceAssessment;
  differenceFromAveragePercent: number | null;
  recentChanges: { t: number; cents: Cents; percent: number }[];
}

const DAY = 24 * 60 * 60 * 1000;
const MIN_ANALYSIS_DAYS = 7;
const MIN_ANALYSIS_SPAN = 7 * DAY;
const PRICE_BAND_PERCENT = 10;
const dateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});

export function observedDayKey(t: number): string {
  const parts = dateParts.formatToParts(t);
  const get = (part: string) => parts.find((item) => item.type === part)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Equal weight per observed day; missing days are not filled with an invented price. */
export function analyzePriceHistory(input: {
  points: Observation[];
  from: number;
  now: number;
  currentCents: Cents | null;
  maxAgeMs: number;
}): HistoryAnalysis {
  const observations = input.points
    .filter((point) => Number.isFinite(point.t) && Number.isInteger(point.cents) && point.cents > 0 &&
      point.t >= input.from && point.t <= input.now)
    .sort((a, b) => a.t - b.t);

  const lastByDay = new Map<string, Observation>();
  for (const point of observations) lastByDay.set(observedDayKey(point.t), point);
  const days = [...lastByDay.values()];
  const prices = days.map((point) => point.cents);
  const observedPrices = observations.map((point) => point.cents);
  const lowest = observedPrices.length ? Math.min(...observedPrices) : null;
  const highest = observedPrices.length ? Math.max(...observedPrices) : null;
  const average = prices.length ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length) : null;
  const firstAt = observations[0]?.t ?? null;
  const lastAt = observations.at(-1)?.t ?? null;
  const changePercent = prices.length >= 2
    ? Math.round(((prices.at(-1)! - prices[0]) / prices[0]) * 100)
    : null;

  const recentChanges: HistoryAnalysis["recentChanges"] = [];
  for (let i = 1; i < observations.length; i++) {
    const previous = observations[i - 1];
    const current = observations[i];
    if (current.cents === previous.cents) continue;
    recentChanges.push({
      t: current.t,
      cents: current.cents,
      percent: Math.round(((current.cents - previous.cents) / previous.cents) * 100),
    });
  }

  const sufficient = days.length >= MIN_ANALYSIS_DAYS && firstAt !== null && lastAt !== null &&
    lastAt - firstAt >= MIN_ANALYSIS_SPAN &&
    input.currentCents !== null && lastAt >= input.now - input.maxAgeMs;
  const differenceFromAveragePercent = sufficient && average !== null
    ? Math.round(((input.currentCents! - average) / average) * 100)
    : null;
  const assessment: PriceAssessment = differenceFromAveragePercent === null ? "insufficient"
    : differenceFromAveragePercent <= -PRICE_BAND_PERCENT ? "low"
      : differenceFromAveragePercent >= PRICE_BAND_PERCENT ? "high" : "normal";

  return {
    observations, observedDays: days.length, firstAt, lastAt, lowest, highest, average,
    changePercent, assessment, differenceFromAveragePercent,
    recentChanges: recentChanges.slice(-5).reverse(),
  };
}
