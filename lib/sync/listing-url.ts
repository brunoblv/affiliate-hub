/**
 * Link do anúncio na própria loja, para o admin conferir o preço na hora. Nunca é exibido ao
 * público (o site só usa /go/{código}); aqui serve só para a revisão humana.
 */
export function storeListingUrl(offer: {
  originalUrl: string | null;
  externalListingId: string | null;
  externalSellerId: string | null;
  store: { connector: string | null };
}): string | null {
  if (offer.originalUrl && /^https?:\/\//i.test(offer.originalUrl)) return offer.originalUrl;
  const id = offer.externalListingId;
  if (!id) return null;
  switch (offer.store.connector) {
    case "shopee":
      return offer.externalSellerId ? `https://shopee.com.br/product/${offer.externalSellerId}/${id}` : null;
    case "aliexpress":
      return `https://pt.aliexpress.com/item/${id}.html`;
    case "mercadolivre":
      return `https://www.mercadolivre.com.br/p/${id}`;
    default:
      return null;
  }
}
