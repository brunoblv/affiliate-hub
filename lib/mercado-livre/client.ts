import { withRetry } from "@/lib/integrations/retry";
import { mercadoLivreRequest } from "./request";

/** Só os campos que o cadastro de Produto usa — a resposta completa vai inteira pra dadosBrutos. */
export interface ItemMercadoLivre {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  pictures: Array<{ url: string }>;
  permalink: string;
  /** Produto de catálogo ao qual este anúncio pertence — usado pela sincronização de preço. */
  catalog_product_id?: string | null;
  [key: string]: unknown;
}

/** GET /items/{id} — único endpoint que a Fase 2 precisa (spec §5.1). */
export async function buscarItemMercadoLivre(id: string): Promise<ItemMercadoLivre> {
  return mercadoLivreRequest<ItemMercadoLivre>(`/items/${id}`);
}

interface ItensCatalogoMercadoLivre {
  results: Array<{ item_id: string; price: number; original_price?: number | null }>;
}

export interface PrecoCatalogoMercadoLivre {
  itemId: string;
  preco: number;
  precoOriginal: number | null;
}

/**
 * `/items/{id}` retorna 403 para anúncios de vendedores fora da conta OAuth
 * conectada — só dá acesso pleno aos próprios anúncios. Produtos de afiliado
 * são de terceiros, então o preço é lido via API de Catálogo, que lista os
 * anúncios (com preço) que disputam a buy box de um produto de catálogo.
 * Sem `itemId`, usa o primeiro resultado (vencedor atual da buy box).
 */
export async function buscarPrecoViaCatalogo(
  catalogProductId: string,
  itemId?: string,
): Promise<PrecoCatalogoMercadoLivre | null> {
  return withRetry(async () => {
    const data = await mercadoLivreRequest<ItensCatalogoMercadoLivre>(`/products/${catalogProductId}/items`);
    const match = itemId ? data.results.find((resultado) => resultado.item_id === itemId) : data.results[0];
    return match ? { itemId: match.item_id, preco: match.price, precoOriginal: match.original_price ?? null } : null;
  });
}

export interface InfoCatalogoMercadoLivre {
  nome: string;
  imagens: string[];
}

/** GET /products/{id} — nome + imagens do produto de catálogo, mesmo acesso irrestrito do preço. */
export async function buscarInfoCatalogo(catalogProductId: string): Promise<InfoCatalogoMercadoLivre> {
  return withRetry(async () => {
    const produto = await mercadoLivreRequest<{ id: string; name: string; pictures?: Array<{ url: string }> }>(
      `/products/${catalogProductId}`,
    );
    return { nome: produto.name, imagens: (produto.pictures ?? []).map((p) => p.url) };
  });
}
