import { withRetry } from "@/lib/integrations/retry";
import { shopeeRequest } from "./request";

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
  const taxaDesconto = node.priceDiscountRate ? Number(node.priceDiscountRate) : 0;
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
  query buscarOfertas($keyword: String, $shopId: Int64, $itemId: Int64, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(
      keyword: $keyword
      shopId: $shopId
      itemId: $itemId
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

/** Busca ofertas ativas por palavra-chave — usada na tela de pesquisa do admin. */
export async function buscarOfertasShopee(params: {
  keyword: string;
  page?: number;
  limit?: number;
  sortType?: number;
}): Promise<OfertaShopee[]> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaProductOfferV2>(QUERY_PRODUCT_OFFER_V2, {
      keyword: params.keyword,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sortType: params.sortType ?? 1,
    });
    return data.productOfferV2.nodes.map(paraOferta);
  });
}

/** Busca a oferta de um item específico — usada no import por link/ID colado e na sincronização de preço. */
export async function buscarOfertaPorItem(shopId: number, itemId: number): Promise<OfertaShopee | null> {
  return withRetry(async () => {
    const data = await shopeeRequest<RespostaProductOfferV2>(QUERY_PRODUCT_OFFER_V2, { shopId, itemId, limit: 1 });
    const node = data.productOfferV2.nodes[0];
    return node ? paraOferta(node) : null;
  });
}

interface RespostaGenerateShortLink {
  generateShortLink: { shortLink: string };
}

const MUTATION_GENERATE_SHORT_LINK = /* GraphQL */ `
  mutation gerarLink($originUrl: String!, $subIds: [String]) {
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
