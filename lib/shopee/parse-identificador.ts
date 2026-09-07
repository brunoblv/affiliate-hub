/** Resultado de identificar um produto da Shopee a partir de texto colado pelo usuário. */
export interface IdentificadorShopee {
  shopId: number | null;
  itemId: number | null;
}

const REGEX_PRODUCT_PATH = /\/product\/(\d+)\/(\d+)/i;
const REGEX_OPAANLP = /\/opaanlp\/(\d+)\/(\d+)/i;
const REGEX_SLUG_SUFFIX = /(?:^|[-/])i\.(\d+)\.(\d+)/i;
const REGEX_SHOP_ITEM_QUERY = /(?:^|[?&#])(?:shop_?id)=(\d+)/i;
const REGEX_ITEM_QUERY = /(?:^|[?&#])(?:item_?id)=(\d+)/i;
const REGEX_HOST_CURTO = /^(s\.shopee\.com\.br|shp\.ee|shope\.ee|id\.shp\.ee)$/i;

const PARAMS_URL_ANINHADA = ["origin_link", "originLink", "redir", "redirect", "url", "landing", "dest", "deeplink"];

const HEADERS_RESOLVER: HeadersInit = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
};

function idsValidos(ids: IdentificadorShopee): ids is { shopId: number; itemId: number } {
  return Boolean(ids.shopId && ids.itemId && ids.shopId > 0 && ids.itemId > 0);
}

function paraIds(shop: string | null | undefined, item: string | null | undefined): IdentificadorShopee {
  const shopId = shop ? Number(shop) : null;
  const itemId = item ? Number(item) : null;
  if (!shopId || !itemId || !Number.isFinite(shopId) || !Number.isFinite(itemId)) {
    return { shopId: null, itemId: null };
  }
  return { shopId, itemId };
}

/** Título aproximado do slug (`Organizador-de-Gaveta-i.123.456` → "Organizador de Gaveta"). */
export function nomeDoSlugShopee(raw: string): string {
  try {
    const url = new URL(normalizarBruto(raw));
    const caminho = decodeURIComponent(url.pathname);
    const match = caminho.match(/\/([^/]+)-i\.\d+\.\d+/i);
    if (!match) return "";
    return decodeURIComponent(match[1]).replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function normalizarBruto(raw: string): string {
  let texto = raw.trim().replace(/^<|>$/g, "").replace(/^['"]+|['"]+$/g, "");
  const urlNoMeio = texto.match(/https?:\/\/[^\s<>"']+(?:shopee|shp\.ee)[^\s<>"']*/i);
  if (urlNoMeio) texto = urlNoMeio[0];
  if (!/^https?:\/\//i.test(texto) && /(shopee|shp\.ee)/i.test(texto)) {
    texto = `https://${texto.replace(/^\/\//, "")}`;
  }
  return texto;
}

function extrairDeTexto(texto: string): IdentificadorShopee {
  const matchSlug = texto.match(REGEX_SLUG_SUFFIX);
  if (matchSlug) return paraIds(matchSlug[1], matchSlug[2]);

  const matchPath = texto.match(REGEX_PRODUCT_PATH) ?? texto.match(REGEX_OPAANLP);
  if (matchPath) return paraIds(matchPath[1], matchPath[2]);

  const shop = texto.match(REGEX_SHOP_ITEM_QUERY)?.[1];
  const item = texto.match(REGEX_ITEM_QUERY)?.[1];
  return paraIds(shop, item);
}

function extrairDaUrl(url: URL): IdentificadorShopee {
  const caminho = `${decodeURIComponent(url.pathname)}${url.search}${url.hash}`;
  const doCaminho = extrairDeTexto(caminho);
  if (idsValidos(doCaminho)) return doCaminho;

  const shop =
    url.searchParams.get("shopid") ??
    url.searchParams.get("shopId") ??
    url.searchParams.get("shop_id");
  const item =
    url.searchParams.get("itemid") ??
    url.searchParams.get("itemId") ??
    url.searchParams.get("item_id");
  const daQuery = paraIds(shop, item);
  if (idsValidos(daQuery)) return daQuery;

  return extrairDeTexto(url.toString());
}

function urlsAninhadas(url: URL): string[] {
  const encontradas: string[] = [];
  for (const chave of PARAMS_URL_ANINHADA) {
    const valor = url.searchParams.get(chave);
    if (valor) encontradas.push(valor);
  }
  for (const valor of url.searchParams.values()) {
    let decodificado = valor;
    try {
      decodificado = decodeURIComponent(valor);
    } catch {
      /* URL já decodificada */
    }
    if (/https?:\/\/[^\s]+shopee|https?:\/\/shp\.ee/i.test(decodificado)) {
      encontradas.push(decodificado);
    }
  }
  return encontradas;
}

function ehHostCurto(hostname: string): boolean {
  return REGEX_HOST_CURTO.test(hostname);
}

function coletarCandidatos(raw: string, profundidade = 0): URL[] {
  if (profundidade > 5) return [];
  const texto = normalizarBruto(raw);
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return [];
  }

  const candidatos = [url];
  for (const aninhada of urlsAninhadas(url)) {
    candidatos.push(...coletarCandidatos(aninhada, profundidade + 1));
  }
  return candidatos;
}

/**
 * Aceita URL longa (`/product/{shopId}/{itemId}`, `...-i.{shopId}.{itemId}`,
 * `/opaanlp/...`, query `shopid`/`itemid`) ou link curto/afiliado
 * (`s.shopee.com.br`, `shp.ee`, `an_redir?origin_link=`). Link curto sem ids
 * no próprio URL exige seguir o redirect.
 */
export async function parseIdentificadorShopee(raw: string): Promise<IdentificadorShopee> {
  const candidatos = coletarCandidatos(raw);
  for (const url of candidatos) {
    const ids = extrairDaUrl(url);
    if (idsValidos(ids)) return ids;
  }

  const curtos = candidatos.filter((url) => ehHostCurto(url.hostname));
  const paraResolver = curtos.length > 0 ? curtos : candidatos;
  for (const url of paraResolver) {
    const resolvida = await resolverLinkCurto(url.toString());
    if (!resolvida) continue;
    const ids = extrairDaUrl(resolvida);
    if (idsValidos(ids)) return ids;
  }

  return { shopId: null, itemId: null };
}

const MAX_REDIRECTS = 8;

/** Segue a cadeia de redirects do link curto sem baixar o corpo, só pra ler o `Location`. */
async function resolverLinkCurto(url: string): Promise<URL | null> {
  let atual = url;

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    try {
      const response = await fetch(atual, {
        method: "GET",
        redirect: "manual",
        headers: HEADERS_RESOLVER,
        signal: AbortSignal.timeout(8_000),
      });
      const location = response.headers.get("location");
      if (!location) {
        const final = new URL(atual);
        const ids = extrairDaUrl(final);
        if (idsValidos(ids)) return final;
        if (response.ok) {
          const html = (await response.text()).slice(0, 200_000);
          const doHtml = extrairDeTexto(html);
          if (idsValidos(doHtml)) {
            return new URL(`https://shopee.com.br/product/${doHtml.shopId}/${doHtml.itemId}`);
          }
        }
        return final;
      }
      const proxima = new URL(location, atual);
      const ids = extrairDaUrl(proxima);
      if (idsValidos(ids)) return proxima;
      for (const aninhada of urlsAninhadas(proxima)) {
        const extra = coletarCandidatos(aninhada);
        for (const candidata of extra) {
          const idsAninhados = extrairDaUrl(candidata);
          if (idsValidos(idsAninhados)) return candidata;
        }
      }
      atual = proxima.toString();
    } catch {
      return null;
    }
  }

  try {
    return new URL(atual);
  } catch {
    return null;
  }
}
