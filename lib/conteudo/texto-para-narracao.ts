/**
 * Transforma o markdown do artigo em texto falável: sem shortcode de produto,
 * sem imagem, sem URL crua de loja. O TTS recita exatamente o que receber.
 */
export function textoParaNarracao(titulo: string, corpo: string): string {
  const falavel = corpo
    .replace(/^\\?\[produto:[a-z0-9-]+\]\s*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>#]/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  const tituloLimpo = titulo.replace(/\s+/g, " ").trim();
  const script = tituloLimpo ? `${tituloLimpo}.\n\n${falavel}` : falavel;

  if (!script.replace(/\./g, "").trim()) {
    throw new Error("O corpo do post não tem texto pra narrar.");
  }

  return script;
}
