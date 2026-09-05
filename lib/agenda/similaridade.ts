/**
 * Similaridade de título por tokens (Jaccard) — regra 2 de
 * docs/hub/regras-postagem-facebook.md. Detecta variações quase idênticas do
 * mesmo produto (ex.: "Kit 4un Enchimento de Almofada 45x45" vs "Enchimento
 * de Almofada 45cm Kit com 4").
 */

const PARE_DE_PALAVRAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "com",
  "para",
  "e",
  "a",
  "o",
  "as",
  "os",
  "em",
  "un",
  "unid",
  "unidade",
  "unidades",
  "kit",
]);

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

/** Limiar padrão da regra 2: 70% de similaridade bloqueia o enfileiramento. */
export const LIMIAR_SIMILARIDADE_PRODUTO = 0.7;

export function tokenizarTitulo(titulo: string): string[] {
  return titulo
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !PARE_DE_PALAVRAS.has(token));
}

export function similaridadeJaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;

  let intersecao = 0;
  for (const token of setA) {
    if (setB.has(token)) intersecao++;
  }

  const uniao = setA.size + setB.size - intersecao;
  return uniao === 0 ? 0 : intersecao / uniao;
}

/** Maior similaridade entre `titulo` e cada título em `titulosExistentes`. */
export function maiorSimilaridade(titulo: string, titulosExistentes: string[]): number {
  const tokens = tokenizarTitulo(titulo);
  let maior = 0;
  for (const existente of titulosExistentes) {
    const similaridade = similaridadeJaccard(tokens, tokenizarTitulo(existente));
    if (similaridade > maior) maior = similaridade;
  }
  return maior;
}
