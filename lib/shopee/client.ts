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
  };
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

const QUERY_PRODUCT_OFFER_V2 = /* GraphQL */ `
  query buscarOfertas(
    $keyword: String
    $shopId: Int64
    $itemId: Int64
    $listType: Int
    $page: Int
    $limit: Int
    $sortType: Int
  ) {
    productOfferV2(
      keyword: $keyword
      shopId: $shopId
      itemId: $itemId
      listType: $listType
      page: $page
      limit: $limit
      sortType: $sortType
    ) {
      nodes {
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
      }
    }
  }
`;

/**
 * Busca ofertas ativas. Com `keyword`, é a busca por palavra-chave da tela de
 * pesquisa do admin; sem `keyword`, usa `listType` pra pegar as top ofertas
 * gerais (0 = recomendados, 1 = maior comissão, 2 = top performance) — usado
 * pela descoberta automática diária.
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
      const data = await shopeeRequest<RespostaProductOfferV2>(QUERY_PRODUCT_OFFER_V2, {
        keyword: params.keyword,
        listType: params.listType,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        sortType: params.sortType ?? 1,
      });
      return data.productOfferV2.nodes.map(paraOferta);
    },
    // A API da Shopee falha de forma intermitente com "graphql: got null for
    // non-null" mesmo em queries válidas repetidas — não é bug de query, é
    // instabilidade do lado deles. Mais tentativas/espera que o default
    // absorvem essas rajadas em vez de propagar erro à toa.
    RETRY_INSTABILIDADE_SHOPEE,
  );
}

/**
 * Busca a oferta de um item específico — usada no import por link/ID colado e
 * na sincronização de preço. `shopId`/`itemId` vão como string na variável:
 * o scalar Int64 da API rejeita ("graphql: wrong type") quando o valor chega
 * como número via variável JSON — só funciona como string ou inline na query.
 */
export async function buscarOfertaPorItem(shopId: number, itemId: number): Promise<OfertaShopee | null> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaProductOfferV2>(QUERY_PRODUCT_OFFER_V2, {
      shopId: String(shopId),
      itemId: String(itemId),
      limit: 1,
    });
    const node = data.productOfferV2.nodes[0];
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
