import { mercadoLivreRequest } from "./request";

/** Só os campos que o cadastro de Produto usa — a resposta completa vai inteira pra dadosBrutos. */
export interface ItemMercadoLivre {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  pictures: Array<{ url: string }>;
  permalink: string;
  [key: string]: unknown;
}

/** GET /items/{id} — único endpoint que a Fase 2 precisa (spec §5.1). */
export async function buscarItemMercadoLivre(id: string): Promise<ItemMercadoLivre> {
  return mercadoLivreRequest<ItemMercadoLivre>(`/items/${id}`);
}
