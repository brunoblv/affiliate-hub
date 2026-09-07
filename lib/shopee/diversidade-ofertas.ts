import { prisma, Destino, Plataforma } from "@/lib/database";
import { chaveCanonicoProduto } from "@/lib/produtos";
import {
  LIMIAR_SIMILARIDADE_PRODUTO,
  maiorSimilaridade,
} from "@/lib/agenda/similaridade";

/** No máximo dois resultados por tipo (cômodo/keyword) na busca e na descoberta. */
export const MAX_POR_TIPO_BUSCA = 2;

/** Título parecido com algo já no catálogo — não mostra e não salva de novo. */
export const LIMIAR_PARECIDO_CATALOGO = 0.62;

export interface IndiceCatalogoShopee {
  ids: Set<string>;
  chaves: Set<string>;
  titulos: string[];
}

export async function indiceCatalogoShopeeCasa(): Promise<IndiceCatalogoShopee> {
  const produtos = await prisma.produto.findMany({
    where: { plataforma: Plataforma.SHOPEE, destino: Destino.MEU_NOVO_LAR },
    select: { idExterno: true, nome: true },
  });
  return {
    ids: new Set(produtos.map((p) => p.idExterno)),
    chaves: new Set(produtos.map((p) => chaveCanonicoProduto(p.nome)).filter(Boolean)),
    titulos: produtos.map((p) => p.nome),
  };
}

export function ofertaJaSalva(
  oferta: { nome: string; idExterno: string },
  indice: IndiceCatalogoShopee,
): boolean {
  if (indice.ids.has(oferta.idExterno)) return true;
  const chave = chaveCanonicoProduto(oferta.nome);
  if (chave && indice.chaves.has(chave)) return true;
  return maiorSimilaridade(oferta.nome, indice.titulos) >= LIMIAR_PARECIDO_CATALOGO;
}

/**
 * Tira o que já está no catálogo e limita repetição do mesmo tipo/título.
 * Quem pontua mais fica; o resto some da lista e não deve ser importado.
 */
export function escolherOfertasDiversas<T>(
  ofertas: T[],
  opts: {
    nome: (oferta: T) => string;
    idExterno: (oferta: T) => string;
    tipo?: (oferta: T) => string;
    score?: (oferta: T) => number;
    indice: IndiceCatalogoShopee;
    maxPorTipo?: number;
    maxTotal?: number;
  },
): T[] {
  const maxPorTipo = opts.maxPorTipo ?? MAX_POR_TIPO_BUSCA;
  const maxTotal = opts.maxTotal ?? 48;
  const ordenadas = opts.score
    ? [...ofertas].sort((a, b) => (opts.score?.(b) ?? 0) - (opts.score?.(a) ?? 0))
    : ofertas;

  const aceitas: T[] = [];
  const titulosAceitos: string[] = [];
  const chavesAceitas = new Set<string>();
  const porTipo = new Map<string, number>();

  for (const oferta of ordenadas) {
    if (aceitas.length >= maxTotal) break;

    const nome = opts.nome(oferta);
    const idExterno = opts.idExterno(oferta);
    if (ofertaJaSalva({ nome, idExterno }, opts.indice)) continue;

    const chave = chaveCanonicoProduto(nome);
    if (chave && chavesAceitas.has(chave)) continue;
    if (maiorSimilaridade(nome, titulosAceitos) >= LIMIAR_SIMILARIDADE_PRODUTO) continue;

    const tipo = opts.tipo?.(oferta);
    if (tipo) {
      const quantidade = porTipo.get(tipo) ?? 0;
      if (quantidade >= maxPorTipo) continue;
      porTipo.set(tipo, quantidade + 1);
    }

    if (chave) chavesAceitas.add(chave);
    titulosAceitos.push(nome);
    aceitas.push(oferta);
  }

  return aceitas;
}
