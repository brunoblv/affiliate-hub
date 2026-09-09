import { Categoria } from "@/lib/database";
import { registrar } from "@/lib/log";
import { obterConfiguracao } from "@/lib/configuracao";
import { buscarOfertasShopee, type OfertaShopee } from "./client";
import { resolverItensBusca, type ItemBusca } from "./catalogo-comodos";
import { classificarOferta, descontoPercentualOferta, pontuarOferta, type MotivoOferta } from "./qualidade-oferta";
import { escolherOfertasDiversas, indiceCatalogoShopeeCasa } from "./diversidade-ofertas";

export const LIMITE_RESULTADOS_PAINEL = 48;

export interface OfertaShopeeCurada {
  itemId: number;
  shopId: number;
  nome: string;
  imagemUrl: string | null;
  precoAtual: number;
  precoOriginal: number | null;
  comissaoPercentual: number | null;
  offerLink: string;
  avaliacaoMedia: number | null;
  vendas: number | null;
  categoria: Categoria;
  comodoId: string;
  comodoLabel: string;
  tipoItemId: string;
  tipoItemLabel: string;
  descontoPct: number;
  jaImportado: boolean;
  motivo: MotivoOferta;
}

export interface ResultadoBuscaPorComodo {
  ofertas: OfertaShopeeCurada[];
  buscasFeitas: number;
  avaliadas: number;
  descartadas: number;
  falhasBusca: number;
}

function paraCurada(oferta: OfertaShopee, item: ItemBusca, motivo: MotivoOferta, jaImportado: boolean): OfertaShopeeCurada {
  return {
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
    categoria: item.categoria,
    comodoId: item.comodoId,
    comodoLabel: item.comodoLabel,
    tipoItemId: item.id,
    tipoItemLabel: item.label,
    descontoPct: descontoPercentualOferta(oferta),
    jaImportado,
    motivo,
  };
}

/**
 * Busca na Shopee pelos tipos escolhidos, filtra promoção/bom preço,
 * tira o que já está no catálogo e limita a dois por tipo — não importa nada.
 * sortType 1 = relevância da keyword (sortType 5 = comissão, que era o que
 * puxava produto fora de casa).
 */
export async function buscarOfertasPorComodo(params: {
  comodoIds: string[];
  tipoIds: string[];
  keywordExtra?: string;
}): Promise<ResultadoBuscaPorComodo> {
  const itens = resolverItensBusca(params.comodoIds, params.tipoIds, params.keywordExtra);
  if (itens.length === 0) {
    return { ofertas: [], buscasFeitas: 0, avaliadas: 0, descartadas: 0, falhasBusca: 0 };
  }

  const encontradas = new Map<string, { oferta: OfertaShopee; item: ItemBusca }>();
  let falhasBusca = 0;

  for (const item of itens) {
    try {
      const [pagina1, pagina2] = await Promise.all([
        buscarOfertasShopee({ keyword: item.keyword, sortType: 1, limit: 20, page: 1 }),
        buscarOfertasShopee({ keyword: item.keyword, sortType: 1, limit: 20, page: 2 }),
      ]);
      for (const oferta of [...pagina1, ...pagina2]) {
        const chave = `${oferta.shopId}_${oferta.itemId}`;
        if (!encontradas.has(chave)) encontradas.set(chave, { oferta, item });
      }
    } catch (erro) {
      falhasBusca++;
      await registrar("ERRO", "PRODUTO_DESCOBERTA", "Falha ao buscar ofertas da Shopee no painel por cômodo", {
        keyword: item.keyword,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  const configuracao = await obterConfiguracao();
  const vendasMinimas = configuracao.motorVendasMinimas;

  const avaliadas = encontradas.size;
  const classificadas: Array<{ oferta: OfertaShopee; item: ItemBusca; motivo: MotivoOferta }> = [];
  for (const { oferta, item } of encontradas.values()) {
    if ((oferta.vendas ?? 0) < vendasMinimas) continue;
    const motivo = classificarOferta(oferta);
    if (motivo) classificadas.push({ oferta, item, motivo });
  }

  classificadas.sort((a, b) => pontuarOferta(b.oferta) - pontuarOferta(a.oferta));

  const indice = await indiceCatalogoShopeeCasa();
  const diversas = escolherOfertasDiversas(classificadas, {
    nome: (c) => c.oferta.nome,
    idExterno: (c) => `${c.oferta.shopId}_${c.oferta.itemId}`,
    tipo: (c) => c.item.id,
    score: (c) => pontuarOferta(c.oferta),
    indice,
    maxTotal: LIMITE_RESULTADOS_PAINEL,
  });

  return {
    ofertas: diversas.map(({ oferta, item, motivo }) => paraCurada(oferta, item, motivo, false)),
    buscasFeitas: itens.length,
    avaliadas,
    descartadas: avaliadas - diversas.length,
    falhasBusca,
  };
}
