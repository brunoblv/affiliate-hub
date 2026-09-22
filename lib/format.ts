/** Money is always integer cents — never floating point (RF-02). */
export type Cents = number;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_ROUNDED = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "R$ 4.799,00" */
export function money(cents: Cents): string {
  return BRL.format(cents / 100);
}

/** "R$ 4.799" — for tight layouts where the cents add noise. */
export function moneyShort(cents: Cents): string {
  return BRL_ROUNDED.format(Math.round(cents / 100));
}

/** "1.299,90" | "1299.90" | "R$ 50" -> centavos inteiros; null se inválido ou <= 0. */
export function parseReais(input: string): Cents | null {
  const cleaned = input.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/** Centavos -> texto editável ("1299,90"), para preencher inputs. */
export function reaisInput(cents: Cents | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function integer(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

/** Percentage drop between a reference price and the current one. */
export function dropPercent(fromCents: Cents, toCents: Cents): number | null {
  if (fromCents <= 0 || toCents >= fromCents) return null;
  return Math.round(((fromCents - toCents) / fromCents) * 100);
}

/** "10x de R$ X"; null when there is no plan (1x is just the cash price). */
export function installmentLabel(totalCents: Cents | null, times: number | null): string | null {
  if (!totalCents || !times || times < 2) return null;
  return installment(totalCents, times);
}

export function installment(totalCents: Cents, times: number): string {
  return `${times}x de ${money(Math.round(totalCents / times))}`;
}

/**
 * Elapsed time as the interface says it: "18 min", "2 h", "3 d".
 * Takes minutes rather than a Date so server and client always agree.
 */
export function elapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / (60 * 24))} d`;
}

/**
 * How long a collected price stays "current". Automatic sources are re-read daily
 * (RF-08); manual prices have no daily job, so they get a longer window.
 */
export function freshnessLimitMinutes(method: string): number {
  return method === "MANUAL" ? 60 * 24 * 7 : 60 * 24;
}

export function isStale(collectedMinutesAgo: number, method: string): boolean {
  return collectedMinutesAgo > freshnessLimitMinutes(method);
}
