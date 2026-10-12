import { normalize, significantTokens } from "./similarity";

/**
 * Impressão digital do título: palavras significativas, sem repetição e em ordem alfabética.
 * Títulos que só diferem na ordem das palavras ou em ruído de vendedor dão a mesma impressão.
 */
export function fingerprintOf(title: string): string {
  const tokens = [...significantTokens(title)].sort();
  return tokens.slice(0, 12).join(" ") || normalize(title).slice(0, 45);
}

/** Mantém o de maior pontuação entre os que têm a mesma impressão digital. */
export function dedupeByFingerprint<T extends { fingerprint: string; score: number }>(items: T[]): T[] {
  const best = new Map<string, T>();
  for (const item of items) {
    const current = best.get(item.fingerprint);
    if (!current || item.score > current.score) best.set(item.fingerprint, item);
  }
  return items.filter((item) => best.get(item.fingerprint) === item);
}
