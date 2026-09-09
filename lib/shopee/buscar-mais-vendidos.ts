import { Categoria } from "@/lib/database";
import { registrar } from "@/lib/log";
import { obterConfiguracao } from "@/lib/configuracao";
import { buscarOfertasPorCategoriaShopee, type OfertaShopee } from "./client";
import { descontoPercentualOferta } from "./qualidade-oferta";
import { escolherOfertasDiversas, indiceCatalogoShopeeCasa } from "./diversidade-ofertas";
import type { OfertaShopeeCurada } from "./buscar-por-comodo";

export const LIMITE_RESULTADOS_MAIS_VENDIDOS = 48;

export interface ResultadoMaisVendidos {
  ofertas: OfertaShopeeCurada[];
  avaliadas: number;
  descartadas: number;
  falhasBusca: number;
}

/**
 * Busca os mais vendidos (sortType=2, "Most Sold") de uma categoria REAL da
 * Shopee (productCatId, ver lib/shopee/categorias-shopee.ts) — não importa
 * nada, só lista pra curadoria manual. Muito mais preciso que buscar por
 * palavra-chave: a Shopee já classificou o produto na categoria certa, não
 * depende de keyword bater por acaso. Aplica o piso de vendas mínimas
 * configurado no motor de produtos (Configuracao.motorVendasMinimas).
 *
 * `categoriaInterna` é só a etiqueta que o produto recebe se for importado
 * (nosso `enum Categoria`, guardado em Produto.categoria) — não influencia
 * a busca em si, que já é 100% pela categoria real da Shopee.
 */
export async function buscarMaisVendidosPorCategoriaShopee(
  categoriaShopeeId: number,
  categoriaInterna: Categoria,
): Promise<ResultadoMaisVendidos> {
  const configuracao = await obterConfiguracao();
  const vendasMinimas = configuracao.motorVendasMinimas;

  let encontradas: OfertaShopee[] = [];
  let falhasBusca = 0;

  try {
    const [pagina1, pagina2] = await Promise.all([
      buscarOfertasPorCategoriaShopee({ productCatId: categoriaShopeeId, sortType: 2, limit: 20, page: 1 }),
      buscarOfertasPorCategoriaShopee({ productCatId: categoriaShopeeId, sortType: 2, limit: 20, page: 2 }),
    ]);
    const porId = new Map<string, OfertaShopee>();
    for (const oferta of [...pagina1, ...pagina2]) porId.set(`${oferta.shopId}_${oferta.itemId}`, oferta);
    encontradas = [...porId.values()];
  } catch (erro) {
    falhasBusca++;
    await registrar("ERRO", "PRODUTO_DESCOBERTA", "Falha ao buscar mais vendidos da Shopee por categoria real", {
      categoriaShopeeId,
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }

  const avaliadas = encontradas.length;
  // Gate leve de propósito: essa tela é sobre popularidade, não desconto —
  // um best-seller sem desconto nenhum ainda é exatamente o que deve
  // aparecer aqui. Só exige foto (pra mostrar no card).
  const elegiveis = encontradas.filter((oferta) => Boolean(oferta.imagemUrl) && (oferta.vendas ?? 0) >= vendasMinimas);

  // Mais vendido primeiro.
  elegiveis.sort((a, b) => (b.vendas ?? 0) - (a.vendas ?? 0));

  const indice = await indiceCatalogoShopeeCasa();
  const diversas = escolherOfertasDiversas(elegiveis, {
    nome: (o) => o.nome,
    idExterno: (o) => `${o.shopId}_${o.itemId}`,
    categoria: () => categoriaInterna,
    score: (o) => o.vendas ?? 0,
    indice,
    maxTotal: LIMITE_RESULTADOS_MAIS_VENDIDOS,
  });

  return {
    ofertas: diversas.map((oferta) => ({
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
      categoria: categoriaInterna,
      comodoId: "mais-vendidos",
      comodoLabel: "Mais vendidos",
      tipoItemId: String(categoriaShopeeId),
      tipoItemLabel: "categoria Shopee",
      descontoPct: descontoPercentualOferta(oferta),
      jaImportado: false,
      // Não usado nesta tela (sem badge de motivo) — placeholder neutro só
      // pra bater com OfertaShopeeCurada, compartilhada com buscar-por-comodo.ts.
      motivo: "bom_preco",
    })),
    avaliadas,
    descartadas: avaliadas - diversas.length,
    falhasBusca,
  };
}
