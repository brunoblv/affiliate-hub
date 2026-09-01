/** Origem do /go para cliques vindos da landing diária (retroalimenta a curadoria). */
export function origemVitrine(slug: string): string {
  return `vitrine:${slug}`;
}

/**
 * Link rastreado do produto na vitrine. Sem link de afiliado, devolve null
 * (CTA desabilitado — nunca a URL crua da loja).
 */
export function linkOfertaVitrine(
  produto: { codigoCurto: string; linkAfiliado: string },
  slug: string,
): string | null {
  if (!produto.linkAfiliado.trim()) return null;
  return `/go/${produto.codigoCurto}?o=${encodeURIComponent(origemVitrine(slug))}`;
}
