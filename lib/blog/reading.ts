import { autoSummary } from "./body";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "8 min de leitura" (≈200 palavras por minuto, sem shortcodes nem marcação). */
export function readingTime(body: string): string {
  const words = autoSummary(body, Number.MAX_SAFE_INTEGER).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min de leitura`;
}

/** "28 set 2026", no fuso de São Paulo. */
export function postDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(value);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return `${get("day")} ${MONTHS[get("month") - 1]} ${get("year")}`;
}

/** "28/09/2026", no fuso de São Paulo. */
export const shortDate = (value: Date) => value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
