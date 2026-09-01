import { ehForaDoTemaCasa } from "./palavras-chave-casa";

export type MotivoOferta = "promocao" | "bom_preco";

export interface OfertaPraClassificar {
  nome: string;
  imagemUrl: string | null;
  precoAtual: number;
  precoOriginal: number | null;
  avaliacaoMedia: number | null;
}

export function descontoPercentualOferta(oferta: Pick<OfertaPraClassificar, "precoAtual" | "precoOriginal">): number {
  if (!oferta.precoOriginal || oferta.precoOriginal <= oferta.precoAtual) return 0;
  return Math.round(((oferta.precoOriginal - oferta.precoAtual) / oferta.precoOriginal) * 100);
}

/**
 * Só passa o que dá pra divulgar: foto, tema casa, e ou promoção clara
 * ou preço baixo com avaliação decente. Comissão alta sozinha não entra —
 * era isso que puxava tênis/action figure na descoberta automática.
 */
export function classificarOferta(oferta: OfertaPraClassificar): MotivoOferta | null {
  if (!oferta.imagemUrl) return null;
  if (ehForaDoTemaCasa(oferta.nome)) return null;

  const desconto = descontoPercentualOferta(oferta);
  const avaliacao = oferta.avaliacaoMedia ?? 0;
  const preco = oferta.precoAtual;

  if (desconto >= 12) return "promocao";
  if (desconto >= 8 && avaliacao >= 4) return "promocao";
  if (avaliacao >= 4.5 && preco <= 89.9) return "bom_preco";
  if (avaliacao >= 4.3 && desconto >= 5 && preco <= 149.9) return "bom_preco";
  if (desconto >= 20) return "promocao";
  return null;
}

/** Ranking pra lista do painel: desconto pesa mais que comissão. */
export function pontuarOferta(
  oferta: OfertaPraClassificar & { comissaoPercentual?: number | null },
): number {
  const desconto = descontoPercentualOferta(oferta);
  const avaliacao = oferta.avaliacaoMedia ?? 0;
  const comissao = Math.min(oferta.comissaoPercentual ?? 0, 12);
  return desconto * 3 + avaliacao * 8 + comissao * 0.4;
}
