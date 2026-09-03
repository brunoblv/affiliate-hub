/** Origem do /go para cliques vindos da landing diária (retroalimenta a curadoria). */
export function origemVitrine(slug: string, canalEtiqueta?: string): string {
  return canalEtiqueta ? `vitrine:${slug}:${canalEtiqueta}` : `vitrine:${slug}`;
}

/**
 * Link rastreado do produto na vitrine. Sem link de afiliado, devolve null
 * (CTA desabilitado — nunca a URL crua da loja).
 */
export function linkOfertaVitrine(
  produto: { codigoCurto: string; linkAfiliado: string },
  slug: string,
  canalEtiqueta?: string,
): string | null {
  if (!produto.linkAfiliado.trim()) return null;
  return `/go/${produto.codigoCurto}?o=${encodeURIComponent(origemVitrine(slug, canalEtiqueta))}`;
}
