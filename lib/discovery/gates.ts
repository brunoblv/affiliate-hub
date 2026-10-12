/**
 * Portões de qualidade (A.4): descarte antes de pontuar. Devolve o motivo (usado em
 * `DiscoveryRun.rejections`) ou null quando o candidato passa. Função pura.
 */
import type { RawCandidate } from "@/lib/connectors/types";
import { normalize } from "./similarity";

export const MIN_TITLE_LENGTH = 15;
export const MIN_PRICE_CENTS = 2_000;
export const MIN_RATING_CENTIS = 450;
export const MIN_SALES = 10;
export const MAX_BRANDS_IN_TITLE = 3;

export interface GateOptions {
  blockedTerms: string[];
  /** Teto de preço opcional da pauta. */
  maxPriceCents?: number | null;
  brandCount: number;
}

/** Termo bloqueado presente no título (palavra ou expressão inteira), ou null. */
export function blockedTermIn(title: string, terms: string[]): string | null {
  const text = ` ${normalize(title)} `;
  for (const term of terms) {
    const needle = normalize(term);
    if (needle && text.includes(` ${needle} `)) return term;
  }
  return null;
}

export function evaluateGates(candidate: RawCandidate, options: GateOptions): string | null {
  if (!candidate.imageUrl) return "sem foto";
  if (candidate.title.trim().length < MIN_TITLE_LENGTH) return "título curto";
  if (candidate.priceCents < MIN_PRICE_CENTS) return "preço baixo";
  if (options.maxPriceCents && candidate.priceCents > options.maxPriceCents) return "preço acima do teto";
  // Nota e vendas só reprovam quando a fonte informa; ausência não reprova.
  if (candidate.ratingCentis !== null && candidate.ratingCentis < MIN_RATING_CENTIS) return "nota baixa";
  if (candidate.salesCount !== null && candidate.salesCount < MIN_SALES) return "poucas vendas";
  if (!candidate.commissionPct) return "sem comissão";
  if (blockedTermIn(candidate.title, options.blockedTerms)) return "termo bloqueado";
  if (options.brandCount > MAX_BRANDS_IN_TITLE) return "título com várias marcas";
  return null;
}

/** Termos de partida da lista de bloqueio (A.4.8); depois editáveis em `BlockedTerm`. */
export const DEFAULT_BLOCKED_TERMS = [
  "replica", "similar", "inspirado", "inspirada", "medicamento", "suplemento", "emagrecedor",
  "emagrecer", "arma", "airsoft", "fumo", "cigarro", "rastreador", "espiao", "funciona em qualquer",
  "paralelo",
];
