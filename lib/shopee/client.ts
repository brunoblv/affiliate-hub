import { withRetry, type RetryOptions } from "@/lib/integrations/retry";
import { registrar } from "@/lib/log";
import { shopeeRequest } from "./request";
import { subIdsParaApi } from "./etiquetas";

const RETRY_INSTABILIDADE_SHOPEE: RetryOptions = { maxAttempts: 5, baseDelayMs: 800 };

/** Fonte da oferta dentro da API de afiliados da Shopee — ver TipoOfertaShopee no schema. */
export type TipoOfertaShopeeApi = "OFERTA_PRODUTO" | "OFERTA_LOJA" | "OFERTA_GERAL";

/** Só os campos que o cadastro de Produto usa — o node inteiro vai pra dadosBrutos. */
export interface OfertaShopee {
  itemId: number;
  shopId: number;
  nome: string;
  imagemUrl: string | null;
  precoAtual: number;
  /** Derivado de priceMin/priceDiscountRate — null quando não há desconto. */
  precoOriginal: number | null;
  comissaoPercentual: number | null;
  /** Valor da comissão já calculado pela API (`commission` = price * commissionRate), na moeda local. */
  comissaoValor: number | null;
  /** Link de afiliado real, já rastreado pela conta conectada — nunca a URL crua do produto. */
  offerLink: string;
  avaliacaoMedia: number | null;
  /** Vendas acumuladas do produto (`sales`, Int32) — confirmado no schema oficial de productOfferV2. */
  vendas: number | null;
  tipoOferta: TipoOfertaShopeeApi;
}

interface NodeProductOfferV2 {
  itemId: number;
  shopId: number;
  productName: string;
  imageUrl: string | null;
  priceMin: string | number;
  priceMax: string | number;
  priceDiscountRate: number | null;
  commissionRate: string | number | null;
  /** `commission` = price * commissionRate, na moeda local — evita recalcular na mão. */
  commission?: string | number | null;
  offerLink: string;
  ratingStar: string | number | null;
  sales?: number | string | null;
}

interface RespostaProductOfferV2 {
  productOfferV2: {
    nodes: NodeProductOfferV2[];
  } | null;
}

/** `productOfferV2` (e `nodes`) podem vir `null` com `data` presente e sem `errors` — item fora da vitrine de oferta. */
function nodesDe(resposta: RespostaProductOfferV2): NodeProductOfferV2[] {
  return resposta.productOfferV2?.nodes ?? [];
}

function paraOferta(node: NodeProductOfferV2, tipoOferta: TipoOfertaShopeeApi = "OFERTA_PRODUTO"): OfertaShopee {
  const precoAtual = Number(node.priceMin);
  // priceDiscountRate vem como inteiro 0-100 (ex.: 44 = 44% off), não fração 0-1.
  const taxaDesconto = node.priceDiscountRate ? Number(node.priceDiscountRate) / 100 : 0;
  const precoOriginal = taxaDesconto > 0 && taxaDesconto < 1 ? precoAtual / (1 - taxaDesconto) : null;

  return {
    itemId: node.itemId,
    shopId: node.shopId,
    nome: node.productName,
    imagemUrl: node.imageUrl ?? null,
    precoAtual,
    precoOriginal,
    comissaoPercentual: node.commissionRate ? Number(node.commissionRate) * 100 : null,
    comissaoValor: node.commission != null ? Number(node.commission) : null,
    offerLink: node.offerLink,
    avaliacaoMedia: node.ratingStar ? Number(node.ratingStar) : null,
    vendas: node.sales != null ? Number(node.sales) : null,
    tipoOferta,
  };
}

const CAMPOS_NODE = /* GraphQL */ `
  itemId
  shopId
  productName
  imageUrl
  priceMin
  priceMax
  priceDiscountRate
  commissionRate
  commission
  sales
  offerLink
  ratingStar
`;

/**
 * Busca por keyword/listType — NÃO declara `$shopId`/`$itemId`. Bug real e
 * 100% reproduzível da API da Shopee: se a query declara essas duas variáveis
 * como `Int64` (opcionais) e a chamada não as preenche, o resolver deles
 * quebra com "graphql: got null for non-null" (extensions.code 10010) —
 * mesmo elas não sendo usadas pra nada nessa busca. Documentos de query
 * separados por caso de uso é o que evita isso, não é só estética.
 */
const QUERY_BUSCAR_OFERTAS = /* GraphQL */ `
  query buscarOfertas($keyword: String, $listType: Int, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(keyword: $keyword, listType: $listType, page: $page, limit: $limit, sortType: $sortType) {
      nodes { ${CAMPOS_NODE} }
    }
  }
`;

/**
 * Busca por item específico — `$shopId`/`$itemId` como `Int64!` (obrigatório)
 * e sempre enviados como string na variável: o scalar Int64 da API rejeita
 * ("graphql: wrong type") valor numérico, e rejeita variável opcional ausente
 * ("got null for non-null") — só funciona obrigatório + string, ver nota acima.
 */
const QUERY_OFERTA_POR_ITEM = /* GraphQL */ `
  query ofertaPorItem($shopId: Int64!, $itemId: Int64!, $limit: Int, $listType: Int) {
    productOfferV2(shopId: $shopId, itemId: $itemId, limit: $limit, listType: $listType) {
      nodes { ${CAMPOS_NODE} }
    }
  }
`;

/**
 * Busca ofertas ativas. Com `keyword`, é a busca por palavra-chave da tela de
 * pesquisa do admin; sem `keyword`, usa `listType` pra pegar as top ofertas
 * gerais. Só `listType: 0` (geral/recomendados, sem filtro de lista) está
 * confirmado em uso; os demais valores não estão documentados/testados aqui
 * — confira no GraphQL Explorer da Shopee antes de usar outro.
 * `sortType`: 1 = relevância da keyword (painel e descoberta de casa);
 * 5 = maior comissão (não usar pra tema casa — puxa produto fora do nicho).
 */
export async function buscarOfertasShopee(params: {
  keyword?: string;
  listType?: number;
  page?: number;
  limit?: number;
  sortType?: number;
}): Promise<OfertaShopee[]> {
  return withRetry(
    async () => {
      const data = await shopeeRequest<RespostaProductOfferV2>(QUERY_BUSCAR_OFERTAS, {
        keyword: params.keyword,
        // `listType` ausente/null quebra o resolver deles ("got null for
        // non-null") mesmo sendo uma variável opcional — só funciona com um
        // valor real. 0 = Recomendados, é o "sem filtro" seguro pra keyword.
        listType: params.listType ?? 0,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        sortType: params.sortType ?? 1,
      });
      return nodesDe(data).map((node) => paraOferta(node));
    },
    // A API da Shopee tem instabilidade real (fora desse bug de variável) —
    // mais tentativas/espera que o default absorvem rajadas curtas.
    RETRY_INSTABILIDADE_SHOPEE,
  );
}

/** Busca a oferta de um item específico — usada no import por link/ID colado e na sincronização de preço. */
export async function buscarOfertaPorItem(shopId: number, itemId: number): Promise<OfertaShopee | null> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaProductOfferV2>(QUERY_OFERTA_POR_ITEM, {
      shopId: String(shopId),
      itemId: String(itemId),
      limit: 1,
      // Sem listType o resolver deles devolve productOfferV2=null na busca por item
      // (o mesmo bug da busca por keyword). 0 = sem filtro de lista.
      listType: 0,
    });
    const node = nodesDe(data)[0];
    return node ? paraOferta(node) : null;
  }, RETRY_INSTABILIDADE_SHOPEE);
}

/**
 * `shopOfferV2` NÃO retorna produtos individuais — é uma campanha de
 * comissão por loja (confirmado no schema oficial: sem itemId/sales/preço,
 * só dados da loja e da campanha). Pra virar Produto de verdade ainda é
 * preciso combinar o shopId daqui com `productOfferV2(shopId: ...)` — essa
 * combinação é responsabilidade de quem chama, não desta função.
 */
export interface OfertaLojaShopee {
  shopId: number;
  shopName: string;
  imagemUrl: string | null;
  comissaoPercentual: number | null;
  /** Cobertura de comissão do vendedor (0-100%) — maior = mais itens da loja pagam comissão. */
  coberturaComissaoVendedorPct: number | null;
  offerLink: string;
  /** 0 = sem teto de orçamento; 1 = baixo (<30% restante); 2 = médio (<50%); 3 = normal (>50%). */
  orcamentoRestante: number;
  periodoInicio: number;
  periodoFim: number;
}

interface NodeShopOfferV2 {
  shopId: number;
  shopName: string;
  imageUrl: string | null;
  commissionRate: string | number | null;
  sellerCommCoveRatio: string | number | null;
  offerLink: string;
  remainingBudget: number;
  periodStartTime: number;
  periodEndTime: number;
}

interface RespostaShopOfferV2 {
  shopOfferV2: { nodes: NodeShopOfferV2[] } | null;
}

const QUERY_OFERTAS_LOJA = /* GraphQL */ `
  query ofertasLoja($shopId: Int64, $keyword: String, $page: Int, $limit: Int, $sortType: Int) {
    shopOfferV2(shopId: $shopId, keyword: $keyword, page: $page, limit: $limit, sortType: $sortType) {
      nodes {
        shopId
        shopName
        imageUrl
        commissionRate
        sellerCommCoveRatio
        offerLink
        remainingBudget
        periodStartTime
        periodEndTime
      }
    }
  }
`;

/**
 * Campanhas de comissão por loja (STORE_OFFER). `sortType`: 1 = mais recente,
 * 2 = maior comissão, 3 = loja mais popular (valores da doc oficial —
 * diferentes do sortType de productOfferV2, não reaproveitar o mesmo default).
 */
export async function buscarOfertasLoja(params: {
  shopId?: number;
  keyword?: string;
  page?: number;
  limit?: number;
  sortType?: number;
}): Promise<OfertaLojaShopee[]> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaShopOfferV2>(QUERY_OFERTAS_LOJA, {
      shopId: params.shopId != null ? String(params.shopId) : undefined,
      keyword: params.keyword,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sortType: params.sortType ?? 2,
    });
    return (data.shopOfferV2?.nodes ?? []).map((node) => ({
      shopId: node.shopId,
      shopName: node.shopName,
      imagemUrl: node.imageUrl ?? null,
      comissaoPercentual: node.commissionRate ? Number(node.commissionRate) * 100 : null,
      coberturaComissaoVendedorPct: node.sellerCommCoveRatio ? Number(node.sellerCommCoveRatio) * 100 : null,
      offerLink: node.offerLink,
      orcamentoRestante: node.remainingBudget,
      periodoInicio: node.periodStartTime,
      periodoFim: node.periodEndTime,
    }));
  }, RETRY_INSTABILIDADE_SHOPEE);
}

/**
 * "Ofertas gerais" da Shopee NÃO é uma query `shopeeOfferV2` com `nodes`
 * (palpite anterior, incorreto) — é o Product Feed: um catálogo em lote por
 * categoria, baixado em duas etapas (listItemFeeds -> getItemFeedData).
 * Confirmado contra a doc oficial (`listItemFeeds`/`getItemFeedData`).
 */
export type ModoFeedItens = "FULL" | "DELTA";

export interface FeedDeItens {
  datafeedId: string;
  datafeedName: string;
  referenceId: string;
  description: string;
  totalCount: number;
  /** Data (string) da última sincronização do feed — formato "AAAA-MM-DD". */
  date: string;
  feedMode: ModoFeedItens;
}

interface RespostaListItemFeeds {
  listItemFeeds: { feeds: FeedDeItens[] } | null;
}

const QUERY_LISTAR_FEEDS = /* GraphQL */ `
  query listarFeeds($feedMode: FeedMode) {
    listItemFeeds(feedMode: $feedMode) {
      feeds {
        datafeedId
        datafeedName
        referenceId
        description
        totalCount
        date
        feedMode
      }
    }
  }
`;

/**
 * Lista os catálogos disponíveis (um por categoria/loja preferencial, ex.
 * "Home Appliance - Preferred"). FULL = catálogo inteiro; DELTA = só o que
 * mudou desde ontem. Primeiro passo pra baixar produtos em lote — ver
 * buscarDadosDoFeed.
 */
export async function listarFeedsDeItens(feedMode: ModoFeedItens = "FULL"): Promise<FeedDeItens[]> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaListItemFeeds>(QUERY_LISTAR_FEEDS, { feedMode });
    return data.listItemFeeds?.feeds ?? [];
  }, RETRY_INSTABILIDADE_SHOPEE);
}

export interface LinhaFeedItens {
  /**
   * JSON serializado com os dados do produto — schema interno (nomes de
   * campo) AINDA NÃO CONFIRMADO. Fazer `JSON.parse` e inspecionar uma
   * amostra real antes de mapear pra OfertaShopee/Produto.
   */
  colunas: string;
  /** Só em modo DELTA — null em FULL. */
  tipoAtualizacao: "NEW" | "UPDATE" | "DELETE" | null;
}

export interface PaginaFeedItens {
  linhas: LinhaFeedItens[];
  offset: number;
  limit: number;
  totalCount: number;
  temMais: boolean;
}

interface NodeItemFeedDataRow {
  columns: string;
  updateType: "NEW" | "UPDATE" | "DELETE" | null;
}

interface RespostaGetItemFeedData {
  getItemFeedData: {
    rows: NodeItemFeedDataRow[];
    pageInfo: { offset: number; limit: number; totalCount: number; hasMore: boolean };
  } | null;
}

const QUERY_DADOS_DO_FEED = /* GraphQL */ `
  query dadosDoFeed($datafeedId: String!, $offset: Int, $limit: Int) {
    getItemFeedData(datafeedId: $datafeedId, offset: $offset, limit: $limit) {
      rows {
        columns
        updateType
      }
      pageInfo {
        offset
        limit
        totalCount
        hasMore
      }
    }
  }
`;

/**
 * Baixa uma página de produtos de um feed (datafeedId vindo de
 * listarFeedsDeItens). `limit` máximo documentado é 500. `columns` de cada
 * linha ainda não tem schema confirmado — ver LinhaFeedItens.
 */
export async function buscarDadosDoFeed(
  datafeedId: string,
  params: { offset?: number; limit?: number } = {},
): Promise<PaginaFeedItens> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaGetItemFeedData>(QUERY_DADOS_DO_FEED, {
      datafeedId,
      offset: params.offset ?? 0,
      limit: params.limit ?? 500,
    });
    const resultado = data.getItemFeedData;
    if (!resultado) return { linhas: [], offset: 0, limit: 0, totalCount: 0, temMais: false };
    return {
      linhas: resultado.rows.map((row) => ({ colunas: row.columns, tipoAtualizacao: row.updateType })),
      offset: resultado.pageInfo.offset,
      limit: resultado.pageInfo.limit,
      totalCount: resultado.pageInfo.totalCount,
      temMais: resultado.pageInfo.hasMore,
    };
  }, RETRY_INSTABILIDADE_SHOPEE);
}

// ---------------------------------------------------------------------------
// Relatórios de conversão/comissão — dashboard de performance por produto/canal
// ---------------------------------------------------------------------------

export interface ItemDoPedidoConversao {
  shopId: number;
  shopName: string;
  itemId: number;
  itemName: string;
  itemPrice: number;
  qty: number;
  imageUrl: string | null;
  /** Comissão total (vendedor + Shopee), já com o teto aplicado. */
  itemTotalCommission: number;
  itemSellerCommission: number;
  itemShopeeCommissionCapped: number;
}

export interface PedidoConversao {
  orderId: string;
  orderStatus: string;
  itens: ItemDoPedidoConversao[];
}

export interface RelatorioConversaoNode {
  purchaseTime: number;
  clickTime: number;
  conversionId: number;
  totalCommission: number;
  buyerType: string;
  /** Sub-id(s) enviados no link de afiliado — formato exato de junção não confirmado, ver relatorio-conversao.ts. */
  utmContent: string | null;
  device: string | null;
  pedidos: PedidoConversao[];
}

interface NodeItemConversao {
  shopId: number;
  shopName: string;
  itemId: number;
  itemName: string;
  itemPrice: string;
  qty: number;
  imageUrl: string | null;
  itemTotalCommission: string;
  itemSellerCommission: string;
  itemShopeeCommissionCapped: string;
}

interface NodePedidoConversao {
  orderId: string;
  orderStatus: string;
  items: NodeItemConversao[];
}

interface NodeConversionReport {
  purchaseTime: number;
  clickTime: number;
  conversionId: number;
  totalCommission: string;
  buyerType: string;
  utmContent: string | null;
  device: string | null;
  orders: NodePedidoConversao[];
}

interface PageInfoScroll {
  limit: number;
  hasNextPage: boolean;
  scrollId: string | null;
}

interface RespostaConversionReport {
  conversionReport: { nodes: NodeConversionReport[]; pageInfo: PageInfoScroll } | null;
}

function paraItemConversao(node: NodeItemConversao): ItemDoPedidoConversao {
  return {
    shopId: node.shopId,
    shopName: node.shopName,
    itemId: node.itemId,
    itemName: node.itemName,
    itemPrice: Number(node.itemPrice),
    qty: node.qty,
    imageUrl: node.imageUrl ?? null,
    itemTotalCommission: Number(node.itemTotalCommission),
    itemSellerCommission: Number(node.itemSellerCommission),
    itemShopeeCommissionCapped: Number(node.itemShopeeCommissionCapped),
  };
}

function paraConversao(node: NodeConversionReport): RelatorioConversaoNode {
  return {
    purchaseTime: node.purchaseTime,
    clickTime: node.clickTime,
    conversionId: node.conversionId,
    totalCommission: Number(node.totalCommission),
    buyerType: node.buyerType,
    utmContent: node.utmContent,
    device: node.device,
    pedidos: node.orders.map((pedido) => ({
      orderId: pedido.orderId,
      orderStatus: pedido.orderStatus,
      itens: pedido.items.map(paraItemConversao),
    })),
  };
}

const QUERY_CONVERSION_REPORT = /* GraphQL */ `
  query conversionReport(
    $purchaseTimeStart: Int64
    $purchaseTimeEnd: Int64
    $orderStatus: DisplayOrderStatus
    $limit: Int
    $scrollId: String
  ) {
    conversionReport(
      purchaseTimeStart: $purchaseTimeStart
      purchaseTimeEnd: $purchaseTimeEnd
      orderStatus: $orderStatus
      limit: $limit
      scrollId: $scrollId
    ) {
      nodes {
        purchaseTime
        clickTime
        conversionId
        totalCommission
        buyerType
        utmContent
        device
        orders {
          orderId
          orderStatus
          items {
            shopId
            shopName
            itemId
            itemName
            itemPrice
            qty
            imageUrl
            itemTotalCommission
            itemSellerCommission
            itemShopeeCommissionCapped
          }
        }
      }
      pageInfo {
        limit
        hasNextPage
        scrollId
      }
    }
  }
`;

/**
 * Uma página do relatório de conversão (pedidos no período, completos ou
 * não). `scrollId` só vale por 30s entre chamadas — para varrer várias
 * páginas, encadear sem pausa; ver `buscarConversoesDoPeriodo` em
 * relatorio-conversao.ts, que já faz isso.
 */
export async function buscarRelatorioConversao(params: {
  purchaseTimeStart?: number;
  purchaseTimeEnd?: number;
  orderStatus?: "ALL" | "UNPAID" | "PENDING" | "COMPLETED" | "CANCELLED";
  limit?: number;
  scrollId?: string;
}): Promise<{ nodes: RelatorioConversaoNode[]; hasNextPage: boolean; scrollId: string | null }> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaConversionReport>(QUERY_CONVERSION_REPORT, {
      // Int64 da API rejeita número puro ("wrong type") — mesma regra de
      // shopId/itemId em buscarOfertaPorItem: só funciona como string.
      purchaseTimeStart: params.purchaseTimeStart != null ? String(params.purchaseTimeStart) : undefined,
      purchaseTimeEnd: params.purchaseTimeEnd != null ? String(params.purchaseTimeEnd) : undefined,
      orderStatus: params.orderStatus ?? "ALL",
      limit: params.limit ?? 500,
      // Doc oficial: "empty for the first query" — variável ausente (undefined
      // vira chave omitida no JSON) quebra o resolver deles com "got null for
      // non-null", mesmo bug documentado pra shopId/itemId em productOfferV2.
      scrollId: params.scrollId ?? "",
    });
    const resultado = data.conversionReport;
    if (!resultado) return { nodes: [], hasNextPage: false, scrollId: null };
    return {
      nodes: resultado.nodes.map(paraConversao),
      hasNextPage: resultado.pageInfo.hasNextPage,
      scrollId: resultado.pageInfo.scrollId,
    };
  }, RETRY_INSTABILIDADE_SHOPEE);
}

interface RespostaValidatedReport {
  validatedReport: { nodes: NodeConversionReport[]; pageInfo: PageInfoScroll } | null;
}

const QUERY_VALIDATED_REPORT = /* GraphQL */ `
  query validatedReport($validationId: Int64!, $limit: Int, $scrollId: String) {
    validatedReport(validationId: $validationId, limit: $limit, scrollId: $scrollId) {
      nodes {
        purchaseTime
        clickTime
        conversionId
        totalCommission
        buyerType
        utmContent
        device
        orders {
          orderId
          orderStatus
          items {
            shopId
            shopName
            itemId
            itemName
            itemPrice
            qty
            imageUrl
            itemTotalCommission
            itemSellerCommission
            itemShopeeCommissionCapped
          }
        }
      }
      pageInfo {
        limit
        hasNextPage
        scrollId
      }
    }
  }
`;

/**
 * Relatório de um ciclo de pagamento já fechado (`validationId`, achado em
 * "Billing Information" no painel da Shopee) — usar pra conferir o valor
 * pago contra o estimado do conversionReport. Não usado pelo dashboard
 * ainda (só o período corrente importa lá); exposto pra reconciliação futura.
 */
export async function buscarRelatorioValidado(params: {
  validationId: number;
  limit?: number;
  scrollId?: string;
}): Promise<{ nodes: RelatorioConversaoNode[]; hasNextPage: boolean; scrollId: string | null }> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaValidatedReport>(QUERY_VALIDATED_REPORT, {
      validationId: String(params.validationId),
      limit: params.limit ?? 500,
      scrollId: params.scrollId,
    });
    const resultado = data.validatedReport;
    if (!resultado) return { nodes: [], hasNextPage: false, scrollId: null };
    return {
      nodes: resultado.nodes.map(paraConversao),
      hasNextPage: resultado.pageInfo.hasNextPage,
      scrollId: resultado.pageInfo.scrollId,
    };
  }, RETRY_INSTABILIDADE_SHOPEE);
}

interface RespostaGenerateShortLink {
  generateShortLink: { shortLink: string };
}

/**
 * Duas mutations: declarar `$subIds` e mandar null quebra o resolver deles
 * (mesmo padrão do `productOfferV2` com shopId/itemId opcionais).
 */
const MUTATION_SEM_SUB_IDS = /* GraphQL */ `
  mutation gerarLink($originUrl: String!) {
    generateShortLink(input: { originUrl: $originUrl }) {
      shortLink
    }
  }
`;

const MUTATION_COM_SUB_IDS = /* GraphQL */ `
  mutation gerarLink($originUrl: String!, $subIds: [String!]!) {
    generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
      shortLink
    }
  }
`;

function ehErroDeParametroShopee(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /11001|Params Error|invalid sub id/i.test(msg);
}

async function pedirShortLink(originUrl: string, subIds?: string[]): Promise<string> {
  const data = subIds?.length
    ? await shopeeRequest<RespostaGenerateShortLink>(MUTATION_COM_SUB_IDS, { originUrl, subIds })
    : await shopeeRequest<RespostaGenerateShortLink>(MUTATION_SEM_SUB_IDS, { originUrl });
  return data.generateShortLink.shortLink;
}

/** Gera o link curto de afiliado. `subIds` viram etiquetas no relatório (utm_content). */
export async function gerarLinkAfiliado(originUrl: string, subIds?: string[]): Promise<string> {
  const etiquetas = subIds?.length ? subIdsParaApi(subIds) : [];
  return withRetry(
    async () => {
      if (etiquetas.length === 0) return pedirShortLink(originUrl);
      try {
        return await pedirShortLink(originUrl, etiquetas);
      } catch (erro) {
        if (!ehErroDeParametroShopee(erro)) throw erro;
        if (etiquetas.length > 1) {
          try {
            return await pedirShortLink(originUrl, etiquetas.slice(0, 1));
          } catch (erroTipo) {
            if (!ehErroDeParametroShopee(erroTipo)) throw erroTipo;
          }
        }
        await registrar("ALERTA", "PRODUTO_SYNC", "Shopee recusou subIds, gerando link sem etiqueta", {
          originUrl,
          subIds: etiquetas,
        });
        return pedirShortLink(originUrl);
      }
    },
    { retryIf: (erro) => !ehErroDeParametroShopee(erro) },
  );
}
