import { Categoria } from "@/lib/database";
import { registrar } from "@/lib/log";
import { obterConfiguracao } from "@/lib/configuracao";
import { ehForaDoTemaCasa } from "@/lib/nicho";
import { buscarOfertasShopee, type OfertaShopee } from "./client";
import { todosItensBusca } from "./catalogo-comodos";
import { descontoPercentualOferta } from "./qualidade-oferta";
import { escolherOfertasDiversas, indiceCatalogoShopeeCasa } from "./diversidade-ofertas";
import type { OfertaShopeeCurada } from "./buscar-por-comodo";

export const LIMITE_RESULTADOS_MAIS_VENDIDOS = 48;
/** Máximo de keywords distintas buscadas por categoria — cada uma é 2 chamadas à API (2 páginas). */
const MAX_KEYWORDS_POR_CATEGORIA = 6;
/**
 * Sem teto por keyword aqui — diferente de buscar-por-comodo.ts, o objetivo
 * desta tela é exatamente "todos os mais vendidos da categoria", então não
 * faz sentido descartar o 3º/4º mais vendido de uma keyword só porque os 2
 * primeiros já entraram. A dedup por categoria (ofertaJaSalva) e por título
 * parecido (dentro do próprio resultado) já evitam repetição de verdade.
 */
const SEM_TETO_POR_KEYWORD = 999;

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
      // 2 páginas (40 itens) por keyword — 1 página só era o motivo real de
      // "poucos resultados": com o teto por keyword daqui removido, o limite
      // agora é só o que a API de fato tem pra oferecer, não o que a gente buscou.
      const [pagina1, pagina2] = await Promise.all([
        buscarOfertasShopee({ keyword, sortType: 2, limit: 20, page: 1 }),
        buscarOfertasShopee({ keyword, sortType: 2, limit: 20, page: 2 }),
      ]);
      for (const oferta of [...pagina1, ...pagina2]) {
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
  const elegiveis: Array<{ oferta: OfertaShopee; keyword: string }> = [];
  for (const { oferta, keyword } of encontradas.values()) {
    if ((oferta.vendas ?? 0) < vendasMinimas) continue;
    // Gate leve de propósito: "mais vendidos" não é sobre desconto/avaliação
    // (isso é o classificarOferta de buscar-por-comodo.ts) — um best-seller
    // sem desconto nenhum ainda é exatamente o que essa tela deve mostrar.
    // Só exige foto (pra mostrar no card) e estar no tema casa.
    if (!oferta.imagemUrl) continue;
    if (ehForaDoTemaCasa(oferta.nome)) continue;
    elegiveis.push({ oferta, keyword });
  }

  // Mais vendido primeiro — é o ponto inteiro dessa tela, diferente da busca
  // por cômodo (que ordena por qualidade/desconto).
  elegiveis.sort((a, b) => (b.oferta.vendas ?? 0) - (a.oferta.vendas ?? 0));

  const indice = await indiceCatalogoShopeeCasa();
  const diversas = escolherOfertasDiversas(elegiveis, {
    nome: (c) => c.oferta.nome,
    idExterno: (c) => `${c.oferta.shopId}_${c.oferta.itemId}`,
    categoria: () => categoria,
    tipo: (c) => c.keyword,
    maxPorTipo: SEM_TETO_POR_KEYWORD,
    score: (c) => c.oferta.vendas ?? 0,
    indice,
    maxTotal: LIMITE_RESULTADOS_MAIS_VENDIDOS,
  });

  return {
    ofertas: diversas.map(({ oferta, keyword }) => ({
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
      // Não usado nesta tela (sem badge de motivo) — placeholder neutro só
      // pra bater com OfertaShopeeCurada, compartilhada com buscar-por-comodo.ts.
      motivo: "bom_preco",
    })),
    keywordsBuscadas: keywords.length,
    avaliadas,
    descartadas: avaliadas - diversas.length,
    falhasBusca,
  };
}
