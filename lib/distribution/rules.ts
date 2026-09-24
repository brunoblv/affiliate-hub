import { createHash } from "node:crypto";

export const DAY = 86_400_000;
export const MAX_DAILY = 3;
export const MIN_GAP = 60 * 60_000;
export const distributionEnabled = () => process.env.DISTRIBUTION_ENABLED === "true";

// IDs numéricos negativos identificam grupos/canais; não aceitar usuários privados.
export function telegramTarget(value: string | null): string | null {
  return value && /^-[1-9]\d{0,15}$/.test(value) && Number.isSafeInteger(Number(value)) ? value : null;
}

export function saoPauloDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** datetime-local do formulário é explicitamente São Paulo, independente do fuso do servidor. */
export function scheduleDate(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}:00-03:00`);
  if (!Number.isFinite(date.getTime())) return null;
  if (new Date(date.getTime() - 3 * 60 * 60_000).toISOString().slice(0, 16) !== raw) return null;
  return date;
}

export function titleSimilarity(a: string, b: string): number {
  const tokens = (value: string) => new Set(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const left = tokens(a), right = tokens(b);
  const union = new Set([...left, ...right]);
  return union.size ? [...left].filter((token) => right.has(token)).length / union.size : 0;
}

export type Slot = { id: string; productId: string; title: string; at: Date };
export function scheduleConflict(candidate: Slot, existing: Slot[]): string | null {
  const others = existing.filter((row) => row.id !== candidate.id);
  if (others.filter((row) => saoPauloDay(row.at) === saoPauloDay(candidate.at)).length >= MAX_DAILY) return "Limite de 3 ofertas por dia neste destino (São Paulo).";
  if (others.some((row) => Math.abs(row.at.getTime() - candidate.at.getTime()) < MIN_GAP)) return "Mantenha pelo menos uma hora entre publicações neste destino.";
  if (others.some((row) => Math.abs(row.at.getTime() - candidate.at.getTime()) < 7 * DAY &&
    (row.productId === candidate.productId || titleSimilarity(row.title, candidate.title) >= 0.7))) return "Produto igual ou título muito semelhante reservado/publicado neste destino nos últimos ou próximos 7 dias.";
  return null;
}

export function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function affiliateTrackingUrl(base: string | undefined, code: string): string {
  if (!base || !/^[a-zA-Z0-9_-]+$/.test(code)) throw new Error("Configure a URL pública HTTPS do Hub e um código afiliado válido.");
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash || !url.hostname.includes(".") || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname.endsWith(".local")) throw new Error("NEXT_PUBLIC_SITE_URL deve ser a origem HTTPS pública do Hub.");
  return `${url.origin}/go/${encodeURIComponent(code)}`;
}
