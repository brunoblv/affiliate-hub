import { Categoria } from "@/lib/database";
import { registrar } from "@/lib/log";
import { obterConfiguracao } from "@/lib/configuracao";
import { buscarOfertasShopee, type OfertaShopee } from "./client";
import { todosItensBusca } from "./catalogo-comodos";
import { classificarOferta, descontoPercentualOferta, type MotivoOferta } from "./qualidade-oferta";
import { escolherOfertasDiversas, indiceCatalogoShopeeCasa } from "./diversidade-ofertas";
import type { OfertaShopeeCurada } from "./buscar-por-comodo";

export const LIMITE_RESULTADOS_MAIS_VENDIDOS = 48;
/** Máximo de keywords distintas buscadas por categoria — cada uma é 1 chamada à API. */
const MAX_KEYWORDS_POR_CATEGORIA = 6;

export interface ResultadoMaisVendidos {
  ofertas: OfertaShopeeCurada[];
  keywordsBuscadas: number;
  avaliadas: number;
  descartadas: number;
  falhasBusca: number;
}

/** Keywords do catálogo de cômodos (catalogo-comodos.ts) que pertencem a essa categoria, sem repetir. */
function keywordsDaCategoria(categoria: Categoria): string[] {
  const vistas = new Set<string>();
  const keywords: string[] = [];
  for (const item of todosItensBusca()) {
    if (item.categoria !== categoria) continue;
    if (vistas.has(item.keyword)) continue;
    vistas.add(item.keyword);
    keywords.push(item.keyword);
  }
  return keywords.slice(0, MAX_KEYWORDS_POR_CATEGORIA);
}

/**
 * Busca os mais vendidos (sortType=2, "Most Sold" na Affiliate Open API) de
 * uma categoria — não importa nada, só lista pra curadoria manual. Aplica o
 * mesmo piso de vendas mínimas configurado no motor de produtos
 * (Configuracao.motorVendasMinimas), então "mais vendidos" já nasce
 * consistente com o resto do fluxo de importação.
 */
export async function buscarMaisVendidosPorCategoria(
  categoria: Categoria,
  params: { keywordExtra?: string } = {},
): Promise<ResultadoMaisVendidos> {
  const keywords = keywordsDaCategoria(categoria);
  const extra = params.keywordExtra?.trim();
  if (extra) keywords.push(extra);

  if (keywords.length === 0) {
    return { ofertas: [], keywordsBuscadas: 0, avaliadas: 0, descartadas: 0, falhasBusca: 0 };
  }

  const configuracao = await obterConfiguracao();
  const vendasMinimas = configuracao.motorVendasMinimas;

  const encontradas = new Map<string, { oferta: OfertaShopee; keyword: string }>();
  let falhasBusca = 0;

  for (const keyword of keywords) {
    try {
      const pagina = await buscarOfertasShopee({ keyword, sortType: 2, limit: 20, page: 1 });
      for (const oferta of pagina) {
        const chave = `${oferta.shopId}_${oferta.itemId}`;
        if (!encontradas.has(chave)) encontradas.set(chave, { oferta, keyword });
      }
    } catch (erro) {
      falhasBusca++;
      await registrar("ERRO", "PRODUTO_DESCOBERTA", "Falha ao buscar mais vendidos da Shopee por categoria", {
        categoria,
        keyword,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  const avaliadas = encontradas.size;
  const classificadas: Array<{ oferta: OfertaShopee; keyword: string; motivo: MotivoOferta }> = [];
  for (const { oferta, keyword } of encontradas.values()) {
    if ((oferta.vendas ?? 0) < vendasMinimas) continue;
    const motivo = classificarOferta(oferta);
    if (motivo) classificadas.push({ oferta, keyword, motivo });
  }

  // Mais vendido primeiro — é o ponto inteiro dessa tela, diferente da busca
  // por cômodo (que ordena por qualidade/desconto).
  classificadas.sort((a, b) => (b.oferta.vendas ?? 0) - (a.oferta.vendas ?? 0));

  const indice = await indiceCatalogoShopeeCasa();
  const diversas = escolherOfertasDiversas(classificadas, {
    nome: (c) => c.oferta.nome,
    idExterno: (c) => `${c.oferta.shopId}_${c.oferta.itemId}`,
    tipo: (c) => c.keyword,
    score: (c) => c.oferta.vendas ?? 0,
    indice,
    maxTotal: LIMITE_RESULTADOS_MAIS_VENDIDOS,
  });

  return {
    ofertas: diversas.map(({ oferta, keyword, motivo }) => ({
      itemId: oferta.itemId,
      shopId: oferta.shopId,
      nome: oferta.nome,
      imagemUrl: oferta.imagemUrl,
      precoAtual: oferta.precoAtual,
      precoOriginal: oferta.precoOriginal,
      comissaoPercentual: oferta.comissaoPercentual,
      offerLink: oferta.offerLink,
      avaliacaoMedia: oferta.avaliacaoMedia,
      vendas: oferta.vendas,
      categoria,
      comodoId: "mais-vendidos",
      comodoLabel: "Mais vendidos",
      tipoItemId: keyword,
      tipoItemLabel: keyword,
      descontoPct: descontoPercentualOferta(oferta),
      jaImportado: false,
      motivo,
    })),
    keywordsBuscadas: keywords.length,
    avaliadas,
    descartadas: avaliadas - diversas.length,
    falhasBusca,
  };
}
