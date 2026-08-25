/** Resultado de identificar um produto da Shopee a partir de texto colado pelo usuário. */
export interface IdentificadorShopee {
  shopId: number | null;
  itemId: number | null;
}

const REGEX_PRODUCT_PATH = /\/product\/(\d+)\/(\d+)/;
const REGEX_SLUG_SUFFIX = /-i\.(\d+)\.(\d+)/;
const REGEX_LINK_CURTO = /^https?:\/\/(s\.shopee\.com\.br|shope\.ee)\//i;

function extrairDaUrl(url: URL): IdentificadorShopee {
  const caminho = `${url.pathname}${url.search}`;

  const matchSlug = caminho.match(REGEX_SLUG_SUFFIX);
  if (matchSlug) return { shopId: Number(matchSlug[1]), itemId: Number(matchSlug[2]) };

  const matchPath = caminho.match(REGEX_PRODUCT_PATH);
  if (matchPath) return { shopId: Number(matchPath[1]), itemId: Number(matchPath[2]) };

  return { shopId: null, itemId: null };
}

/**
 * Aceita URL longa (`/product/{shopId}/{itemId}` ou `...-i.{shopId}.{itemId}`)
 * ou link curto (`s.shopee.com.br/...`, `shope.ee/...`). Link curto exige
 * seguir o redirect (I/O) pra descobrir a URL final — diferente do parser do
 * Mercado Livre, que é só regex.
 */
export async function parseIdentificadorShopee(raw: string): Promise<IdentificadorShopee> {
  const trimmed = raw.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { shopId: null, itemId: null };
  }

  if (REGEX_LINK_CURTO.test(trimmed)) {
    const resolvida = await resolverLinkCurto(trimmed);
    if (!resolvida) return { shopId: null, itemId: null };
    url = resolvida;
  }

  return extrairDaUrl(url);
}

const MAX_REDIRECTS = 5;

/** Segue a cadeia de redirects do link curto sem baixar o corpo da página, só pra ler o `Location`. */
async function resolverLinkCurto(url: string): Promise<URL | null> {
  let atual = url;

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    try {
      const response = await fetch(atual, { method: "GET", redirect: "manual" });
      const location = response.headers.get("location");
      if (!location) return new URL(atual);
      atual = new URL(location, atual).toString();
    } catch {
      return null;
    }
  }

  return new URL(atual);
}
