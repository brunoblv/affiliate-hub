/**
 * Categorias reais de nível 1 da Shopee (não confundir com nosso `enum
 * Categoria`, que é uma classificação própria pro nicho do site). IDs
 * confirmados empiricamente via `shopeeOfferV2` (campo `categoryId`) — a
 * Affiliate Open API não expõe uma query dedicada de listagem de categorias,
 * então esses pares id/nome foram coletados na prática, não documentados
 * oficialmente. Usar como `productCatId` em `productOfferV2` pra filtrar
 * produtos por categoria de verdade (ver buscar-mais-vendidos.ts).
 *
 * Se a Shopee adicionar/remover categoria, essa lista fica desatualizada —
 * não há como validar automaticamente sem rodar a coleta de novo.
 */
export interface CategoriaShopee {
  id: number;
  nome: string;
}

export const CATEGORIAS_SHOPEE: CategoriaShopee[] = [
  { id: 100001, nome: "Health" },
  { id: 100009, nome: "Fashion Accessories" },
  { id: 100010, nome: "Home Appliances" },
  { id: 100011, nome: "Men Clothes" },
  { id: 100012, nome: "Men Shoes" },
  { id: 100013, nome: "Mobile & Gadgets" },
  { id: 100015, nome: "Travel & Luggage" },
  { id: 100016, nome: "Women Bags" },
  { id: 100017, nome: "Women Clothes" },
  { id: 100531, nome: "Food Delivery" },
  { id: 100532, nome: "Women Shoes" },
  { id: 100533, nome: "Men Bags" },
  { id: 100534, nome: "Watches" },
  { id: 100535, nome: "Audio" },
  { id: 100629, nome: "Food & Beverages" },
  { id: 100630, nome: "Beauty" },
  { id: 100631, nome: "Pets" },
  { id: 100632, nome: "Mom & Baby" },
  { id: 100633, nome: "Baby & Kids Fashion" },
  { id: 100634, nome: "Gaming & Consoles" },
  { id: 100635, nome: "Cameras & Drones" },
  { id: 100636, nome: "Home & Construction" },
  { id: 100637, nome: "Sports & Outdoors" },
  { id: 100638, nome: "Stationery" },
  { id: 100639, nome: "Toys & Hobbies" },
  { id: 100640, nome: "Automobiles" },
  { id: 100641, nome: "Motorcycles" },
  { id: 100642, nome: "Tickets, Vouchers & Services" },
  { id: 100643, nome: "Books & Magazines" },
  { id: 100644, nome: "Computers & Accessories" },
];

/** As duas categorias reais que claramente batem com o nicho casa/lar. */
export const CATEGORIAS_SHOPEE_CASA_IDS = new Set([100010, 100636]);
