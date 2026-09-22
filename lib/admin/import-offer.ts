import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { checkImageUrl } from "@/lib/images/check";
import { invalidateOutdatedCreatives } from "@/lib/creatives/invalidate";
import { productSearchText } from "@/lib/search-text";
import { slugify } from "@/lib/slug";
import type { FetchResult } from "@/lib/connectors";

const newShortCode = () => randomBytes(5).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");

export async function uniqueProductSlug(name: string): Promise<string> {
  const root = slugify(name) || "produto";
  let slug = root;
  for (let n = 2; await prisma.product.findUnique({ where: { slug } }); n++) slug = `${root}-${n}`;
  return slug;
}

/**
 * Cria a oferta a partir de uma coleta bem-sucedida: oferta, primeiro ponto do histórico,
 * link de afiliado (quando a fonte ou o admin informam) e foto (só se o produto ainda não tem).
 */
export async function attachFetchedOffer(input: {
  productId: string;
  variantId: string;
  store: { id: string; name: string };
  listingId: string;
  sellerId: string | null;
  originalUrl: string | null;
  result: Extract<FetchResult, { kind: "ok" }>;
  /** Usado quando a fonte não devolve link de afiliado (Mercado Livre). */
  fallbackAffiliateUrl?: string | null;
}) {
  const { result } = input;
  const offer = await prisma.offer.create({
    data: {
      variantId: input.variantId,
      storeId: input.store.id,
      sellerName: result.sellerName || input.store.name,
      externalListingId: input.listingId,
      externalSellerId: input.sellerId,
      originalUrl: input.originalUrl,
      availability: result.availability ?? "UNKNOWN",
      priceCents: result.priceCents,
      previousPriceCents: result.previousPriceCents,
      priceCheckedAt: result.observedAt,
      lastAttemptAt: result.observedAt,
      method: "API",
    },
  });
  await prisma.pricePoint.create({
    data: { offerId: offer.id, priceCents: result.priceCents, availability: offer.availability, source: "API" },
  });

  const affiliateUrl = result.affiliateUrl ?? input.fallbackAffiliateUrl ?? null;
  if (affiliateUrl) {
    await prisma.affiliateLink.create({ data: { offerId: offer.id, url: affiliateUrl, shortCode: newShortCode() } });
  }

  if (result.imageUrl && (await prisma.productImage.count({ where: { productId: input.productId } })) === 0) {
    const check = await checkImageUrl(result.imageUrl);
    if (check.ok) {
      await prisma.productImage.create({ data: { productId: input.productId, url: result.imageUrl, position: 0 } });
    }
  }

  await invalidateOutdatedCreatives(input.productId);
  return offer;
}

/** Produto novo (rascunho, variação "Padrão") a partir do que a loja informou. */
export async function createDraftProduct(input: { name: string; nicheIds: string[]; categoryId: string | null }) {
  const name = input.name.trim().slice(0, 140);
  return prisma.product.create({
    data: {
      name,
      slug: await uniqueProductSlug(name),
      searchText: productSearchText({ name }),
      categoryId: input.categoryId,
      variants: { create: { label: "Padrão", isDefault: true } },
      niches: { create: input.nicheIds.map((nicheId) => ({ nicheId })) },
    },
    include: { variants: true },
  });
}
