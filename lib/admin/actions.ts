"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { slugify } from "@/lib/slug";
import { parseReais } from "@/lib/format";
import { productSearchText } from "@/lib/search-text";
import { getConnector, listConnectors } from "@/lib/connectors";
import { checkImageUrl } from "@/lib/images/check";
import { attachFetchedOffer } from "@/lib/admin/import-offer";
import { invalidateOutdatedCreatives } from "@/lib/creatives/invalidate";
import {
  Availability,
  CollectionMethod,
  ItemCondition,
  OfferStatus,
  ProductStatus,
  ShippingKind,
} from "@/lib/generated/prisma/enums";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;
const flag = (data: FormData, key: string) => data.get(key) === "on";

function oneOf<T extends string>(values: Record<string, T>, raw: string, fallback: T): T {
  return (Object.values(values) as string[]).includes(raw) ? (raw as T) : fallback;
}

/** Volta para a tela com a mensagem de erro no topo (evita a página de erro do Next). */
function fail(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}erro=${encodeURIComponent(message)}`);
}

function httpUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = base || "item";
  let slug = root;
  for (let n = 2; await exists(slug); n++) slug = `${root}-${n}`;
  return slug;
}

const newShortCode = () => randomBytes(5).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");

// ---------------------------------------------------------------------------
// Lojas
// ---------------------------------------------------------------------------

export async function saveStore(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const name = text(data, "name");
  if (!name) fail("/admin/lojas", "Informe o nome da loja.");
  const connectorKey = text(data, "connector");
  const connector = getConnector(connectorKey) ? connectorKey : null;
  // Loja com conector coleta por API; sem conector, vale o método escolhido.
  const method = connector ? "API" : oneOf(CollectionMethod, text(data, "method"), "MANUAL");
  const active = flag(data, "active");

  if (id) {
    await prisma.store.update({ where: { id }, data: { name, method, connector, active } });
    // Ofertas já cadastradas acompanham o método da loja.
    if (connector) await prisma.offer.updateMany({ where: { storeId: id }, data: { method: "API" } });
  } else {
    const slug = await uniqueSlug(slugify(name), async (s) => !!(await prisma.store.findUnique({ where: { slug: s } })));
    await prisma.store.create({ data: { name, slug, method, connector, active: true } });
  }
  revalidatePath("/admin/lojas");
  redirect("/admin/lojas");
}

export async function deleteStore(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  if (await prisma.offer.count({ where: { storeId: id } })) {
    fail("/admin/lojas", "A loja tem ofertas. Desative em vez de excluir.");
  }
  await prisma.store.delete({ where: { id } });
  revalidatePath("/admin/lojas");
  redirect("/admin/lojas");
}

// ---------------------------------------------------------------------------
// Nichos e categorias
// ---------------------------------------------------------------------------

export async function saveNiche(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const name = text(data, "name");
  if (!name) fail("/admin/categorias", "Informe o nome do nicho.");
  const fields = {
    name,
    description: optional(data, "description"),
    icon: optional(data, "icon"),
    color: optional(data, "color"),
    position: Number.parseInt(text(data, "position"), 10) || 0,
    active: id ? flag(data, "active") : true,
  };

  if (id) {
    await prisma.niche.update({ where: { id }, data: fields });
  } else {
    const slug = await uniqueSlug(slugify(name), async (s) => !!(await prisma.niche.findUnique({ where: { slug: s } })));
    await prisma.niche.create({ data: { ...fields, slug } });
  }
  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

export async function deleteNiche(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  if (await prisma.productNiche.count({ where: { nicheId: id } })) {
    fail("/admin/categorias", "O nicho tem produtos associados. Desative em vez de excluir.");
  }
  await prisma.niche.delete({ where: { id } });
  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

export async function saveCategory(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const name = text(data, "name");
  const nicheId = text(data, "nicheId");
  const parentId = optional(data, "parentId");
  if (!name || !nicheId) fail("/admin/categorias", "Informe nome e nicho da categoria.");
  if (id && parentId === id) fail("/admin/categorias", "Uma categoria não pode ser pai de si mesma.");

  if (id) {
    await prisma.category.update({ where: { id }, data: { name, nicheId, parentId } });
  } else {
    const slug = await uniqueSlug(slugify(name), async (s) => !!(await prisma.category.findUnique({ where: { slug: s } })));
    await prisma.category.create({ data: { name, slug, nicheId, parentId } });
  }
  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

export async function deleteCategory(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export async function createProduct(data: FormData) {
  await requireAdmin();
  const name = text(data, "name");
  if (!name) fail("/admin/produtos/novo", "Informe o nome do produto.");

  const slug = await uniqueSlug(slugify(name), async (s) => !!(await prisma.product.findUnique({ where: { slug: s } })));
  const nicheIds = data.getAll("nicheIds").map(String).filter(Boolean);
  const brand = optional(data, "brand");

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      brand,
      searchText: productSearchText({ name, brand }),
      categoryId: optional(data, "categoryId"),
      // Toda variação parte da padrão, mesmo sem opções (RF-01).
      variants: { create: { label: "Padrão", isDefault: true } },
      niches: { create: nicheIds.map((nicheId) => ({ nicheId })) },
    },
  });
  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${product.id}`);
}

export async function updateProduct(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const back = `/admin/produtos/${id}?aba=dados`;
  const name = text(data, "name");
  const slug = slugify(text(data, "slug"));
  if (!name || !slug) fail(back, "Nome e slug são obrigatórios.");

  const taken = await prisma.product.findFirst({ where: { slug, NOT: { id } } });
  if (taken) fail(back, "Já existe outro produto com esse slug.");

  const nicheIds = data.getAll("nicheIds").map(String).filter(Boolean);
  const brand = optional(data, "brand");
  const model = optional(data, "model");
  const gtin = optional(data, "gtin");
  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        brand,
        model,
        gtin,
        searchText: productSearchText({ name, brand, model, gtin }),
        summary: optional(data, "summary"),
        categoryId: optional(data, "categoryId"),
      },
    }),
    prisma.productNiche.deleteMany({ where: { productId: id } }),
    prisma.productNiche.createMany({ data: nicheIds.map((nicheId) => ({ productId: id, nicheId })) }),
  ]);
  revalidatePath("/admin/produtos");
  redirect(back);
}

export async function setProductStatus(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const status = oneOf(ProductStatus, text(data, "status"), "DRAFT");
  await prisma.product.update({ where: { id }, data: { status } });
  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${id}`);
}

export async function deleteProduct(data: FormData) {
  await requireAdmin();
  await prisma.product.delete({ where: { id: text(data, "id") } });
  revalidatePath("/admin/produtos");
  redirect("/admin/produtos");
}

// ---------------------------------------------------------------------------
// Variações
// ---------------------------------------------------------------------------

export async function addVariant(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const back = `/admin/produtos/${productId}?aba=variacoes`;
  const label = text(data, "label");
  if (!label) fail(back, "Informe o rótulo da variação (ex.: 30 ml, kit com 3).");

  await prisma.productVariant.create({ data: { productId, label } });
  redirect(back);
}

export async function deleteVariant(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id } });
  const back = `/admin/produtos/${variant.productId}?aba=variacoes`;
  if (variant.isDefault) fail(back, "A variação padrão não pode ser removida.");
  if (await prisma.offer.count({ where: { variantId: id } })) {
    fail(back, "A variação tem ofertas. Remova as ofertas antes.");
  }
  await prisma.productVariant.delete({ where: { id } });
  redirect(back);
}

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------

export async function saveOffer(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const productId = text(data, "productId");
  const back = `/admin/produtos/${productId}?aba=ofertas`;

  const variantId = text(data, "variantId");
  const storeId = text(data, "storeId");
  const sellerName = text(data, "sellerName");
  if (!variantId || !storeId || !sellerName) fail(back, "Variação, loja e vendedor são obrigatórios.");

  const priceRaw = text(data, "price");
  const priceCents = priceRaw ? parseReais(priceRaw) : null;
  if (priceRaw && priceCents === null) fail(back, "Preço inválido.");
  const previousRaw = text(data, "previousPrice");
  const previousPriceCents = previousRaw ? parseReais(previousRaw) : null;
  if (previousRaw && previousPriceCents === null) fail(back, "Preço anterior inválido.");

  const originalUrl = httpUrl(optional(data, "originalUrl"));
  if (text(data, "originalUrl") && !originalUrl) fail(back, "URL original inválida (use http/https).");
  const affiliateUrl = httpUrl(optional(data, "affiliateUrl"));
  if (text(data, "affiliateUrl") && !affiliateUrl) fail(back, "URL de afiliado inválida (use http/https).");

  // Loja com conector: o preço vem da API, então precisamos dos IDs do anúncio.
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const connector = getConnector(store?.connector);
  let externalListingId = optional(data, "externalListingId");
  let externalSellerId = optional(data, "externalSellerId");
  if (connector) {
    const parsed = originalUrl && connector.parseUrl ? connector.parseUrl(originalUrl) : null;
    externalListingId ??= parsed?.listingId ?? null;
    externalSellerId ??= parsed?.sellerId ?? null;
    if (!externalListingId || (connector.requiresSellerId !== false && !externalSellerId)) {
      fail(
        back,
        `Para coletar o preço por ${connector.label}, cole a URL completa do produto (links curtos não servem) ou informe o ID do anúncio e o ID da loja.`,
      );
    }
  }

  const shippingKind = oneOf(ShippingKind, text(data, "shippingKind"), "UNKNOWN");
  const shippingRaw = text(data, "shipping");
  const installmentRaw = text(data, "installmentPrice");
  if (installmentRaw && parseReais(installmentRaw) === null) fail(back, "Preço parcelado inválido.");
  const fields = {
    variantId,
    storeId,
    sellerName,
    externalListingId,
    externalSellerId,
    originalUrl,
    priceCents,
    previousPriceCents,
    installments: Number.parseInt(text(data, "installments"), 10) || null,
    installmentPriceCents: installmentRaw ? parseReais(installmentRaw) : null,
    priceCondition: text(data, "priceCondition").slice(0, 60) || null,
    shippingKind,
    shippingCents: shippingKind === "PAID" && shippingRaw ? parseReais(shippingRaw) : null,
    condition: oneOf(ItemCondition, text(data, "condition"), "NEW"),
    availability: oneOf(Availability, text(data, "availability"), "UNKNOWN"),
    status: oneOf(OfferStatus, text(data, "status"), "ACTIVE"),
    active: id ? flag(data, "active") : true,
  };

  const previous = id ? await prisma.offer.findUnique({ where: { id } }) : null;
  const priceChanged = priceCents !== null && priceCents !== previous?.priceCents;
  const priceFields = priceChanged ? { priceCheckedAt: new Date() } : {};

  let offerId = id;
  try {
    if (id) {
      await prisma.offer.update({ where: { id }, data: { ...fields, ...priceFields } });
    } else {
      const created = await prisma.offer.create({
        data: { ...fields, ...priceFields, method: connector ? "API" : "MANUAL" },
      });
      offerId = created.id;
    }
  } catch {
    fail(back, "Já existe uma oferta com esse anúncio nessa loja e variação.");
  }

  // Um ponto por mudança de preço: o histórico fica intacto para as demais ofertas.
  if (priceChanged && priceCents !== null) {
    await prisma.pricePoint.create({
      data: { offerId, priceCents, availability: fields.availability, source: "MANUAL" },
    });
  }

  // Um link de afiliado principal por oferta; o código público nunca muda.
  if (affiliateUrl) {
    const existing = await prisma.affiliateLink.findFirst({ where: { offerId }, orderBy: { createdAt: "asc" } });
    if (existing) {
      await prisma.affiliateLink.update({ where: { id: existing.id }, data: { url: affiliateUrl } });
    } else {
      await prisma.affiliateLink.create({ data: { offerId, url: affiliateUrl, shortCode: newShortCode() } });
    }
  }

  // Preço mudou (ou a oferta foi ajustada): capas com preço ainda não publicadas perdem a validade.
  await invalidateOutdatedCreatives(productId);

  revalidatePath(`/admin/produtos/${productId}`);
  redirect(back);
}

/**
 * Cadastro em um passo: cola a URL do produto e a oferta nasce pronta (vendedor, preço,
 * preço anterior, IDs, link de afiliado e foto vêm da API da loja). Só lojas com conector.
 */
export async function importOfferFromUrl(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const back = `/admin/produtos/${productId}?aba=ofertas`;
  const variantId = text(data, "variantId");
  const url = httpUrl(optional(data, "url"));
  if (!url || !variantId) fail(back, "Informe a variação e a URL completa do produto.");

  const stores = await prisma.store.findMany({ where: { connector: { not: null } } });
  const match = stores
    .map((store) => ({ store, connector: getConnector(store.connector) }))
    .find(({ connector }) => connector?.parseUrl?.(url));
  if (!match?.connector) {
    const known = listConnectors().find((candidate) => candidate.parseUrl?.(url));
    fail(
      back,
      known
        ? `Cadastre a loja em /admin/lojas escolhendo o conector "${known.label}" e tente de novo.`
        : "Não reconheci a loja dessa URL. Use a URL completa do produto (Shopee) ou da página de catálogo /p/MLB… (Mercado Livre).",
    );
  }
  const { store, connector } = match;
  const parsed = connector.parseUrl!(url)!;
  if (!connector.isConfigured()) fail(back, `${connector.label} não está configurada no servidor.`);

  let result;
  try {
    result = await connector.fetchOffer({
      externalListingId: parsed.listingId,
      externalSellerId: parsed.sellerId,
      originalUrl: url,
    });
  } catch (error) {
    fail(back, `A ${connector.label} não respondeu: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
  }
  if (result.kind !== "ok") {
    fail(back, "A loja não devolveu esse produto (fora da vitrine de afiliados ou removido). Cadastre manualmente.");
  }

  const duplicate = await prisma.offer.findFirst({
    where: { variantId, storeId: store.id, externalListingId: parsed.listingId },
  });
  if (duplicate) fail(back, "Essa oferta já está cadastrada nessa variação.");

  await attachFetchedOffer({
    productId,
    variantId,
    store,
    listingId: parsed.listingId,
    sellerId: parsed.sellerId,
    originalUrl: url,
    result,
    fallbackAffiliateUrl: httpUrl(optional(data, "affiliateUrl")),
  });
  revalidatePath(`/admin/produtos/${productId}`);
  redirect(back);
}

export async function deleteOffer(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const offer = await prisma.offer.findUniqueOrThrow({ where: { id }, include: { variant: true } });
  await prisma.offer.delete({ where: { id } });
  redirect(`/admin/produtos/${offer.variant.productId}?aba=ofertas`);
}

// ---------------------------------------------------------------------------
// Imagens
// ---------------------------------------------------------------------------

export async function addImage(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const back = `/admin/produtos/${productId}?aba=imagens`;
  const url = httpUrl(optional(data, "url"));
  if (!url) fail(back, "URL da imagem inválida (use http/https).");

  const existing = await prisma.productImage.findMany({ where: { productId } });
  if (existing.some((image) => image.url === url)) fail(back, "Essa imagem já foi adicionada.");

  // A foto precisa existir de verdade: confere se a URL devolve uma imagem (e é um endereço público).
  const check = await checkImageUrl(url);
  if (!check.ok) fail(back, `Não foi possível adicionar: ${check.reason}`);

  const variantId = optional(data, "variantId");
  if (variantId && !(await prisma.productVariant.findFirst({ where: { id: variantId, productId } }))) {
    fail(back, "Variação inválida.");
  }

  await prisma.productImage.create({
    data: {
      productId,
      url,
      alt: optional(data, "alt"),
      variantId,
      source: "manual",
      verifiedAt: new Date(),
      position: existing.length,
      isCover: existing.length === 0,
    },
  });
  revalidatePath("/produto/[slug]", "page");
  redirect(back);
}

/** Sobe ou desce uma foto na ordem. */
export async function moveImage(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const direction = text(data, "direction") === "up" ? -1 : 1;
  const image = await prisma.productImage.findUniqueOrThrow({ where: { id } });
  const list = await prisma.productImage.findMany({ where: { productId: image.productId }, orderBy: [{ position: "asc" }, { id: "asc" }] });
  const index = list.findIndex((item) => item.id === id);
  const target = index + direction;
  if (target >= 0 && target < list.length) {
    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await prisma.$transaction(reordered.map((item, position) => prisma.productImage.update({ where: { id: item.id }, data: { position } })));
  }
  revalidatePath("/produto/[slug]", "page");
  redirect(`/admin/produtos/${image.productId}?aba=imagens`);
}

/** Vincula a foto a uma variação (ou a solta, para valer para o produto todo). */
export async function setImageVariant(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const image = await prisma.productImage.findUniqueOrThrow({ where: { id } });
  const variantId = optional(data, "variantId");
  if (variantId && !(await prisma.productVariant.findFirst({ where: { id: variantId, productId: image.productId } }))) {
    fail(`/admin/produtos/${image.productId}?aba=imagens`, "Variação inválida.");
  }
  await prisma.productImage.update({ where: { id }, data: { variantId } });
  revalidatePath("/produto/[slug]", "page");
  redirect(`/admin/produtos/${image.productId}?aba=imagens`);
}

/** Confere de novo a URL da foto (útil depois de a loja trocar o arquivo). */
export async function recheckImage(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const image = await prisma.productImage.findUniqueOrThrow({ where: { id } });
  const check = await checkImageUrl(image.url);
  await prisma.productImage.update({ where: { id }, data: { broken: !check.ok, verifiedAt: new Date() } });
  revalidatePath("/produto/[slug]", "page");
  redirect(`/admin/produtos/${image.productId}?aba=imagens`);
}

export async function setCoverImage(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const image = await prisma.productImage.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId: image.productId }, data: { isCover: false } }),
    prisma.productImage.update({ where: { id }, data: { isCover: true } }),
  ]);
  redirect(`/admin/produtos/${image.productId}?aba=imagens`);
}

export async function deleteImage(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const image = await prisma.productImage.findUniqueOrThrow({ where: { id } });
  await prisma.productImage.delete({ where: { id } });
  if (image.isCover) {
    const next = await prisma.productImage.findFirst({ where: { productId: image.productId }, orderBy: { position: "asc" } });
    if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isCover: true } });
  }
  redirect(`/admin/produtos/${image.productId}?aba=imagens`);
}
