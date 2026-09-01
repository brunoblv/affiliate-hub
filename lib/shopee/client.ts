import { withRetry, type RetryOptions } from "@/lib/integrations/retry";
import { shopeeRequest } from "./request";

const RETRY_INSTABILIDADE_SHOPEE: RetryOptions = { maxAttempts: 5, baseDelayMs: 800 };

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
  /** Link de afiliado real, já rastreado pela conta conectada — nunca a URL crua do produto. */
  offerLink: string;
  avaliacaoMedia: number | null;
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
  offerLink: string;
  ratingStar: string | number | null;
}

interface RespostaProductOfferV2 {
  productOfferV2: {
    nodes: NodeProductOfferV2[];
  } | null;
}

/** `productOfferV2` pode vir `null` mesmo com `data` presente e sem `errors` — sem isso o `.nodes` explode com "Cannot read properties of null". */
function nodesDe(resposta: RespostaProductOfferV2): NodeProductOfferV2[] {
  if (!resposta.productOfferV2) {
    throw new Error("Shopee API retornou productOfferV2=null. Verifique a query/variáveis enviadas.");
  }
  return resposta.productOfferV2.nodes;
}

function paraOferta(node: NodeProductOfferV2): OfertaShopee {
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
    offerLink: node.offerLink,
    avaliacaoMedia: node.ratingStar ? Number(node.ratingStar) : null,
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
  query ofertaPorItem($shopId: Int64!, $itemId: Int64!, $limit: Int) {
    productOfferV2(shopId: $shopId, itemId: $itemId, limit: $limit) {
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
      return nodesDe(data).map(paraOferta);
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
    });
    const node = nodesDe(data)[0];
    return node ? paraOferta(node) : null;
  }, RETRY_INSTABILIDADE_SHOPEE);
}

interface RespostaGenerateShortLink {
  generateShortLink: { shortLink: string };
}

const MUTATION_GENERATE_SHORT_LINK = /* GraphQL */ `
  mutation gerarLink($originUrl: String!, $subIds: [String!]) {
    generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
      shortLink
    }
  }
`;

/** Fallback para quando a busca não retorna `offerLink` — gera o link de afiliado real a partir da URL do produto. */
export async function gerarLinkAfiliado(originUrl: string, subIds?: string[]): Promise<string> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaGenerateShortLink>(MUTATION_GENERATE_SHORT_LINK, { originUrl, subIds });
    return data.generateShortLink.shortLink;
  });
}
