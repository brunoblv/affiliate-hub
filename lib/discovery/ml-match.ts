import { prisma } from "@/lib/db";
import { mercadoLivreConnector, mercadoLivreGet } from "@/lib/connectors/mercado-livre";
import { attachFetchedOffer } from "@/lib/admin/import-offer";
import {
  REVIEW_MIN_SCORE,
  buildSearchQuery,
  compareProducts,
  isAutoMatch,
  type Similarity,
} from "./similarity";

interface CatalogSearchResult {
  results?: {
    id: string;
    name: string;
    pictures?: { url: string }[];
    attributes?: { id: string; value_name: string | null }[];
  }[];
}

interface CatalogItems {
  results?: { price: number; condition?: string }[];
}

const attribute = (result: NonNullable<CatalogSearchResult["results"]>[number], id: string) =>
  result.attributes?.find((a) => a.id === id)?.value_name ?? null;

/** Menor preço entre os anúncios novos do produto de catálogo (o que a oferta vai acompanhar). */
async function catalogPriceCents(catalogId: string): Promise<number | null> {
  const items = await mercadoLivreGet<CatalogItems>(`/products/${catalogId}/items`);
  const winner = items?.results?.find((item) => (item.condition ?? "new") === "new");
  return winner ? Math.round(winner.price * 100) : null;
}

export interface MlMatch {
  catalogId: string;
  name: string;
  imageUrl: string | null;
  priceCents: number | null;
  similarity: Similarity;
}

/** Procura no catálogo do ML os produtos parecidos com este e os ordena por similaridade. */
export async function findMlMatches(shopee: { name: string; priceCents: number }, top = 3): Promise<MlMatch[]> {
  const query = buildSearchQuery(shopee.name);
  if (!query) return [];
  const search = await mercadoLivreGet<CatalogSearchResult>(
    `/products/search?status=active&site_id=MLB&limit=6&q=${encodeURIComponent(query)}`,
  );

  // Pré-ordena sem preço (barato) e só consulta o preço dos melhores candidatos.
  const pre = (search?.results ?? [])
    .map((result) => ({
      result,
      first: compareProducts(shopee, {
        name: result.name,
        brand: attribute(result, "BRAND"),
        model: attribute(result, "MODEL"),
        priceCents: null,
      }),
    }))
    .sort((a, b) => b.first.score - a.first.score)
    .slice(0, top);

  const matches: MlMatch[] = [];
  for (const { result } of pre) {
    const priceCents = await catalogPriceCents(result.id).catch(() => null);
    const similarity = compareProducts(shopee, {
      name: result.name,
      brand: attribute(result, "BRAND"),
      model: attribute(result, "MODEL"),
      priceCents,
    });
    matches.push({
      catalogId: result.id,
      name: result.name,
      imageUrl: result.pictures?.[0]?.url ?? null,
      priceCents,
      similarity,
    });
  }
  return matches.sort((a, b) => b.similarity.score - a.similarity.score);
}

export type MatchOutcome = "auto" | "pending" | "none" | "skipped";

/**
 * Procura correspondências no ML para um produto e grava as sugestões. Vincula sozinho só quando
 * marca e modelo batem com folga; o resto fica pendente para a escolha na tela de Correspondências.
 */
export async function matchProductToMl(productId: string): Promise<MatchOutcome> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { include: { offers: { include: { store: true } } } } },
  });
  if (!product) return "skipped";

  const offers = product.variants.flatMap((variant) => variant.offers);
  const hasMl = offers.some((offer) => offer.store.connector === mercadoLivreConnector.key);
  const source = offers.find((offer) => offer.priceCents !== null && offer.store.connector !== mercadoLivreConnector.key);
  const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const store = await prisma.store.findFirst({ where: { connector: mercadoLivreConnector.key, active: true } });
  if (hasMl || !source || !variant || !store || !mercadoLivreConnector.isConfigured()) return "skipped";

  const matches = await findMlMatches({ name: product.name, priceCents: source.priceCents! });
  const visible = matches.filter((m) => m.similarity.score >= REVIEW_MIN_SCORE);

  const best = visible[0];
  const auto = best ? isAutoMatch(best.similarity, visible[1]?.similarity.score ?? null) : false;

  for (const match of visible) {
    await prisma.matchSuggestion.upsert({
      where: { productId_catalogId: { productId, catalogId: match.catalogId } },
      update: { score: match.similarity.score, priceCents: match.priceCents, reasons: match.similarity.reasons },
      create: {
        productId,
        catalogId: match.catalogId,
        name: match.name,
        imageUrl: match.imageUrl,
        priceCents: match.priceCents,
        score: match.similarity.score,
        reasons: match.similarity.reasons,
        status: auto && match === best ? "AUTO" : "PENDING",
      },
    });
  }

  if (auto && best) {
    const attached = await attachMlOffer(productId, variant.id, store, best.catalogId, null);
    if (!attached) {
      await prisma.matchSuggestion.updateMany({
        where: { productId, catalogId: best.catalogId },
        data: { status: "PENDING" },
      });
    }
  }

  await prisma.product.update({ where: { id: productId }, data: { mlMatchCheckedAt: new Date() } });
  return auto ? "auto" : visible.length > 0 ? "pending" : "none";
}

/** Cria a oferta do Mercado Livre para o produto (com o link de afiliado, se já houver). */
export async function attachMlOffer(
  productId: string,
  variantId: string,
  store: { id: string; name: string },
  catalogId: string,
  affiliateUrl: string | null,
): Promise<boolean> {
  if (await prisma.offer.findFirst({ where: { variantId, storeId: store.id, externalListingId: catalogId } })) return true;
  const result = await mercadoLivreConnector.fetchOffer({ externalListingId: catalogId, externalSellerId: null, originalUrl: null });
  if (result.kind !== "ok") return false;
  await attachFetchedOffer({
    productId,
    variantId,
    store,
    listingId: catalogId,
    sellerId: null,
    originalUrl: `https://www.mercadolivre.com.br/p/${catalogId}`,
    result,
    fallbackAffiliateUrl: affiliateUrl,
  });
  return true;
}
