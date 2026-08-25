/** Resultado de identificar um anúncio/produto do Mercado Livre a partir de texto colado pelo usuário. */
export interface IdentificadorMercadoLivre {
  /** ID do produto de catálogo (`/p/MLB...` na URL) — presente quando o link veio de uma página de catálogo. */
  catalogProductId: string | null;
  /** ID do anúncio (`MLBxxxxxxxxxx`) — nem sempre presente em links de catálogo sem tracking de ads. */
  itemId: string | null;
}

const REGEX_MLB_ID = /^MLBU?\d+$/i;
const REGEX_CATALOG_PATH = /-p\/(?:up\/)?(MLBU?\d+)/i;
const REGEX_ITEM_ID_PARAM = /(?:item_id|wid)[:=](MLB\d+)/i;
const REGEX_ANUNCIO_SLUG = /\/(MLB-\d+)-/i;

/**
 * Aceita tanto um ID cru (`MLB1234567890`) quanto uma URL de anúncio ou de
 * produto de catálogo colada do site do Mercado Livre, e extrai os IDs
 * relevantes para consulta na API.
 */
export function parseIdentificadorMercadoLivre(raw: string): IdentificadorMercadoLivre {
  const trimmed = raw.trim();

  if (REGEX_MLB_ID.test(trimmed)) {
    return { catalogProductId: null, itemId: trimmed.toUpperCase() };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { catalogProductId: null, itemId: null };
  }

  const catalogMatch = url.pathname.match(REGEX_CATALOG_PATH);
  const catalogProductId = catalogMatch ? catalogMatch[1].toUpperCase() : null;

  let searchAndHash = `${url.search}${url.hash}`;
  try {
    searchAndHash = decodeURIComponent(searchAndHash);
  } catch {
    // mantém a string original (ainda codificada) se a decodificação falhar
  }

  const itemIdMatch = searchAndHash.match(REGEX_ITEM_ID_PARAM) ?? trimmed.match(REGEX_ANUNCIO_SLUG);
  const itemId = itemIdMatch ? itemIdMatch[1].toUpperCase().replace("-", "") : null;

  return { catalogProductId, itemId };
}
