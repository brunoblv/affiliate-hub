/**
 * Leitura pública do catálogo (Prisma -> tipos da interface).
 *
 * Regras que valem para todo o site:
 * - só produto PUBLICADO aparece;
 * - só oferta ativa, com preço e com link de afiliado ativo aparece: sem link não
 *   há botão, e nunca se usa a URL crua da loja como substituto;
 * - preço, menor preço e contagens são calculados aqui a partir das ofertas.
 */
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { normalize } from "@/lib/search-text";
import { cheapestFirst, isEligible, summarize } from "@/lib/pricing";
import type { Cents } from "@/lib/format";
import type { Category, Offer, Product, Spec, Store, Variant } from "@/lib/types";
import { asSections } from "@/lib/content/validate";
import type { ContentSections } from "@/lib/content/types";
import { historicalOfferIds } from "@/lib/adsense/quality-data";
import { canonicalHistoryOfferId, evaluateProductQuality } from "@/lib/adsense/quality";
import { aggregateVariantHistory, type OfferObservation } from "@/lib/history/variant";

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

const PUBLIC_OFFER = {
  active: true,
  priceCents: { not: null },
  store: { active: true },
  links: { some: { active: true } },
} satisfies Prisma.OfferWhereInput;

const HAS_PUBLIC_OFFER = {
  variants: { some: { offers: { some: PUBLIC_OFFER } } },
} satisfies Prisma.ProductWhereInput;

const productInclude = {
  category: true,
  niches: { include: { niche: true } },
  images: { orderBy: [{ isCover: "desc" }, { position: "asc" }] },
  variants: {
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    include: {
      offers: {
        where: PUBLIC_OFFER,
        include: {
          store: true,
          links: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type OfferRow = ProductRow["variants"][number]["offers"][number];

// ---------------------------------------------------------------------------
// Mapeamento
// ---------------------------------------------------------------------------

export interface CatalogProduct {
  product: Product;
  /** Todas as ofertas públicas, de todas as variações, da mais barata para a mais cara. */
  offers: Offer[];
  /** Lojas que aparecem nas ofertas acima. */
  stores: Store[];
  niche: { id: string; slug: string; name: string } | null;
  categoryName: string | null;
  createdAt: Date;
  /** Texto editorial PUBLICADO (nunca rascunho). */
  content: ContentSections | null;
}

const AVAILABILITY = { IN_STOCK: "em_estoque", OUT_OF_STOCK: "sem_estoque", UNKNOWN: "desconhecida" } as const;
const STATUS = { ACTIVE: "ativo", STALE: "desatualizado", ERROR: "erro" } as const;

function shippingOf(offer: OfferRow): Offer["shipping"] {
  switch (offer.shippingKind) {
    case "FREE":
      return { kind: "gratis", label: "Frete grátis" };
    case "PAID":
      return offer.shippingCents
        ? { kind: "valor", cents: offer.shippingCents, label: `Frete R$ ${(offer.shippingCents / 100).toFixed(2).replace(".", ",")}` }
        : { kind: "desconhecido", label: "Frete não informado" };
    case "CONDITIONAL":
      return { kind: "condicional", label: "Frete grátis em condições da loja" };
    default:
      return { kind: "desconhecido", label: "Frete não informado" };
  }
}

function mapOffer(row: OfferRow, productId: string, now: number): Offer | null {
  const link = row.links[0];
  if (!link || row.priceCents === null) return null;
  const checkedAt = (row.priceCheckedAt ?? row.updatedAt).getTime();
  return {
    id: row.id,
    productId,
    variantId: row.variantId,
    storeId: row.storeId,
    seller: row.sellerName,
    priceCents: row.priceCents,
    previousPriceCents: row.previousPriceCents ?? undefined,
    installments: row.installments,
    installmentPriceCents: row.installmentPriceCents,
    priceCondition: row.priceCondition,
    shipping: shippingOf(row),
    availability: AVAILABILITY[row.availability],
    method: row.method,
    status: STATUS[row.status],
    collectedMinutesAgo: Math.max(0, Math.round((now - checkedAt) / 60_000)),
    shortCode: link.shortCode,
  };
}

function mapStore(row: { id: string; name: string; method: Store["method"] }): Store {
  return { id: row.id, name: row.name, method: row.method };
}

function parseSpecs(json: Prisma.JsonValue | null): Spec[] {
  const text = (value: unknown) => (value === null || value === undefined ? null : String(value));
  if (Array.isArray(json)) {
    return json.flatMap((item) =>
      item && typeof item === "object" && !Array.isArray(item) && typeof item.key === "string"
        ? [{ key: item.key, value: text(item.value) }]
        : [],
    );
  }
  if (json && typeof json === "object") {
    return Object.entries(json).map(([key, value]) => ({ key, value: text(value) }));
  }
  return [];
}

function parseAttributes(json: Prisma.JsonValue | null): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]));
}

/**
 * Fotos visíveis: as quebradas somem, e as gerais (sem variação) vêm antes das específicas de
 * uma variação, para o card do produto nunca abrir com a foto de uma variação só (RF-14).
 */
function orderedImages(row: ProductRow): Product["images"] {
  const defaultVariantId = row.variants.find((variant) => variant.isDefault)?.id;
  const rank = (image: ProductRow["images"][number]) =>
    (image.variantId === null ? 0 : image.variantId === defaultVariantId ? 1 : 2) * 2 + (image.isCover ? 0 : 1);
  return row.images
    .filter((image) => !image.broken)
    .sort((a, b) => rank(a) - rank(b) || a.position - b.position)
    .map((image) => ({ url: image.url, alt: image.alt ?? row.name, variantId: image.variantId }));
}

function mapProduct(row: ProductRow, now: number): CatalogProduct {
  const offers = cheapestFirst(
    row.variants.flatMap((variant) =>
      variant.offers.flatMap((offer) => {
        const mapped = mapOffer(offer, row.id, now);
        return mapped ? [mapped] : [];
      }),
    ),
  );

  const niches = row.niches
    .map((item) => item.niche)
    .filter((niche) => niche.active)
    .sort((a, b) => a.position - b.position);
  const niche = niches[0] ?? null;

  const variants: Variant[] = row.variants.map((variant) => ({
    id: variant.id,
    label: variant.label,
    attributes: parseAttributes(variant.attributes),
  }));

  return {
    product: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      brand: row.brand ?? "",
      model: row.model ?? "",
      gtin: row.gtin ?? "",
      categorySlug: niche?.slug ?? "",
      summary: row.summary ?? "",
      rating: null,
      reviewCount: null,
      imageCount: row.images.filter((image) => !image.broken).length,
      images: orderedImages(row),
      variants,
      specs: parseSpecs(row.specs),
      prices: summarize(offers),
    },
    offers,
    stores: [
      ...new Map(
        row.variants.flatMap((variant) => variant.offers.map((offer) => [offer.store.id, mapStore(offer.store)] as const)),
      ).values(),
    ],
    niche: niche ? { id: niche.id, slug: niche.slug, name: niche.name } : null,
    categoryName: row.category?.name ?? null,
    createdAt: row.createdAt,
    content: null,
  };
}

// ---------------------------------------------------------------------------
// Nichos, lojas, marcas
// ---------------------------------------------------------------------------

/** Ícone por palavra-chave do nome (ordem importa: o primeiro que casar vence). */
const NICHE_ICON_RULES: Array<[RegExp, string]> = [
  [/bolsa/, "bag"],
  [/cal[cç]ado/, "shoe"],
  [/acess[oó]rios de moda/, "accessory"],
  [/pe[cç]as|ve[ií]culo/, "car"],
  [/moda|roupa/, "shirt"],
  [/aliment|bebida/, "food"],
  [/beleza/, "beauty"],
  [/c[aâ]mera|drone/, "camera"],
  [/computador|notebook/, "laptop"],
  [/celular|smartphone/, "phone"],
  [/eletrodom/, "kitchen"],
  [/casa|decora/, "home"],
  [/esporte|ar livre/, "sports"],
  [/game|console/, "games"],
  [/hobb|cole[cç]/, "hobby"],
  [/livro|revista/, "book"],
  [/m[aã]e|beb[eê]|infantil/, "baby"],
  [/papelaria/, "stationery"],
  [/pet/, "pet"],
  [/rel[oó]gio/, "watch"],
  [/sa[uú]de/, "health"],
  [/[aá]udio|fone/, "audio"],
  [/ferrament/, "tools"],
  [/\btv\b|televis/, "tv"],
];

function nicheIcon(name: string, icon: string | null): string {
  if (icon) return icon;
  const n = name.toLowerCase();
  return NICHE_ICON_RULES.find(([re]) => re.test(n))?.[1] ?? "home";
}

function mapNiche(niche: { slug: string; name: string; description: string | null; icon: string | null; id: string }): Category {
  return {
    id: niche.id,
    slug: niche.slug,
    name: niche.name,
    tagline: niche.description ?? "",
    icon: nicheIcon(niche.name, niche.icon),
  };
}

export async function listNiches(): Promise<Category[]> {
  const rows = await prisma.niche.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return rows.map(mapNiche);
}

export async function getNiche(slug: string): Promise<Category | null> {
  const row = await prisma.niche.findFirst({ where: { slug, active: true } });
  return row ? mapNiche(row) : null;
}

/** Lojas que têm ao menos uma oferta pública num produto publicado (filtros e nomes). */
export async function listStores(): Promise<Store[]> {
  const rows = await prisma.store.findMany({
    where: {
      active: true,
      offers: {
        some: {
          active: true,
          priceCents: { not: null },
          links: { some: { active: true } },
          variant: { product: { status: "PUBLISHED" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return rows.map(mapStore);
}

export async function listBrands(nicheSlug?: string): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      brand: { not: null },
      ...(nicheSlug ? { niches: { some: { niche: { slug: nicheSlug, active: true } } } } : {}),
    },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.flatMap((row) => (row.brand ? [row.brand] : []));
}

/** Contagens reais para a home; nada de número fixo. */
export async function catalogCounts(): Promise<{ offers: number; stores: number }> {
  const [offers, stores] = await Promise.all([
    prisma.offer.count({ where: { ...PUBLIC_OFFER, variant: { product: { status: "PUBLISHED" } } } }),
    listStores(),
  ]);
  return { offers, stores: stores.length };
}

// ---------------------------------------------------------------------------
// Produto
// ---------------------------------------------------------------------------

/** Em cache por requisição: generateMetadata e a página compartilham a mesma leitura. */
export const getProductBySlug = cache(async (slug: string): Promise<CatalogProduct | null> => {
  const row = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: productInclude,
  });
  if (!row) return null;
  const mapped = mapProduct(row, Date.now());
  const content = await prisma.productContent.findFirst({ where: { productId: row.id, status: "PUBLISHED" } });
  return { ...mapped, content: content?.sections ? asSections(content.sections) : null };
});

/** Produtos publicados por id (favoritos e alertas). Ids despublicados ficam de fora do mapa. */
export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  if (!ids.length) return new Map();
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: productInclude,
  });
  const now = Date.now();
  return new Map(rows.map((row) => [row.id, mapProduct(row, now).product]));
}

/** Outros produtos do mesmo nicho, os que têm oferta atual primeiro. */
export async function listRelated(product: Product, limit = 4): Promise<Product[]> {
  if (!product.categorySlug) return [];
  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: product.id },
      niches: { some: { niche: { slug: product.categorySlug, active: true } } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
    include: productInclude,
  });
  const now = Date.now();
  return rows
    .map((row) => mapProduct(row, now).product)
    .sort((a, b) => Number(b.prices.lowestCents !== null) - Number(a.prices.lowestCents !== null))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

export interface SearchOptions {
  term?: string;
  nicheSlug?: string;
  brands?: string[];
  storeIds?: string[];
  minCents?: Cents;
  maxCents?: Cents;
  availableOnly?: boolean;
  sort?: "relevancia" | "menor-preco" | "atualizacao";
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  pageCount: number;
}

function inStores(storeIds: string[]): Prisma.ProductWhereInput {
  const offer: Prisma.OfferWhereInput = { ...PUBLIC_OFFER, storeId: { in: storeIds } };
  return { variants: { some: { offers: { some: offer } } } };
}

/** Teto de candidatos lidos do banco antes dos filtros de preço (feitos em memória). */
const SEARCH_CANDIDATES = 300;

export async function searchProducts(options: SearchOptions): Promise<SearchResult> {
  const terms = normalize(options.term ?? "").split(" ").filter(Boolean);
  const pageSize = options.pageSize ?? 24;

  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        ...terms.map((term) => ({ searchText: { contains: term } })),
        ...(options.nicheSlug
          ? [{ niches: { some: { niche: { slug: options.nicheSlug, active: true } } } }]
          : []),
        ...(options.brands?.length ? [{ brand: { in: options.brands } }] : []),
        ...(options.storeIds?.length ? [inStores(options.storeIds)] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: SEARCH_CANDIDATES,
    include: productInclude,
  });

  const now = Date.now();
  let found = rows.map((row) => mapProduct(row, now).product).filter(({ prices }) => {
    if (options.availableOnly && prices.lowestCents === null) return false;
    if (options.minCents !== undefined && (prices.lowestCents ?? 0) < options.minCents) return false;
    if (options.maxCents !== undefined && (prices.lowestCents ?? Infinity) > options.maxCents) return false;
    return true;
  });

  if (options.sort === "menor-preco") {
    found = found.sort((a, b) => (a.prices.lowestCents ?? Infinity) - (b.prices.lowestCents ?? Infinity));
  } else if (options.sort === "atualizacao") {
    found = found.sort((a, b) => (a.prices.freshestMinutesAgo ?? Infinity) - (b.prices.freshestMinutesAgo ?? Infinity));
  } else if (terms.length) {
    const rank = (p: Product) => (normalize(p.name).startsWith(terms[0]) ? 0 : 1);
    found = found.sort((a, b) => rank(a) - rank(b));
  }

  const pageCount = Math.max(1, Math.ceil(found.length / pageSize));
  const page = Math.min(Math.max(1, options.page ?? 1), pageCount);
  return {
    products: found.slice((page - 1) * pageSize, page * pageSize),
    total: found.length,
    page,
    pageCount,
  };
}

// ---------------------------------------------------------------------------
// Histórico e ofertas em destaque
// ---------------------------------------------------------------------------

export interface PricePointView {
  /** epoch ms */
  t: number;
  cents: Cents;
}

async function loadSeries(offerIds: string[], since: Date): Promise<Map<string, PricePointView[]>> {
  const map = new Map<string, PricePointView[]>();
  if (!offerIds.length) return map;
  const points = await prisma.pricePoint.findMany({
    where: { offerId: { in: offerIds }, observedAt: { gte: since } },
    orderBy: { observedAt: "asc" },
  });
  for (const point of points) {
    const list = map.get(point.offerId) ?? [];
    list.push({ t: point.observedAt.getTime(), cents: point.priceCents });
    map.set(point.offerId, list);
  }
  return map;
}

/**
 * Histórico de UMA oferta. Séries de anúncios diferentes nunca se misturam
 * (seção 10 do documento): o gráfico é da oferta mais barata da variação.
 */
export async function getOfferHistory(offerId: string): Promise<PricePointView[]> {
  const since = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);
  return (await loadSeries([offerId], since)).get(offerId) ?? [];
}

/** Daily minimum among currently public offers of the selected variation and item condition. */
export async function getVariantPriceHistory(
  variantId: string | undefined,
  offerIds: string[],
  selectedOfferId: string | undefined,
): Promise<{ points: PricePointView[]; itemCondition: "NEW" | "USED"; priceCondition: string | null } | null> {
  if (!variantId || !selectedOfferId || offerIds.length === 0) return null;
  const offers = await prisma.offer.findMany({
    where: { id: { in: offerIds }, variantId },
    select: { id: true, condition: true, priceCondition: true },
  });
  const selected = offers.find((offer) => offer.id === selectedOfferId);
  if (!selected) return null;
  const comparable = offers.filter((offer) => offer.condition === selected.condition);
  const offerById = new Map(comparable.map((offer) => [offer.id, offer]));
  const since = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);
  const rows = await prisma.pricePoint.findMany({
    where: { offerId: { in: comparable.map((offer) => offer.id) }, observedAt: { gte: since } },
    select: {
      offerId: true, variantId: true, itemCondition: true, priceCents: true,
      priceCondition: true, availability: true, observedAt: true,
    },
    orderBy: { observedAt: "asc" },
  });
  const observations: OfferObservation[] = rows.flatMap((row) => {
    const offer = offerById.get(row.offerId);
    return offer ? [{
      offerId: row.offerId, variantId: row.variantId, itemCondition: row.itemCondition,
      priceCondition: row.priceCondition, availability: row.availability,
      t: row.observedAt.getTime(), cents: row.priceCents,
    }] : [];
  });
  const priceCondition = selected.priceCondition;
  return {
    points: aggregateVariantHistory(observations, {
      variantId, itemCondition: selected.condition, priceCondition,
    }),
    itemCondition: selected.condition,
    priceCondition,
  };
}

async function loadCandidates(take: number): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { status: "PUBLISHED", ...HAS_PUBLIC_OFFER },
    orderBy: { updatedAt: "desc" },
    take,
    include: productInclude,
  });
  const now = Date.now();
  return rows.map((row) => mapProduct(row, now).product).filter((p) => p.prices.lowestCents !== null);
}

export interface DropView {
  product: Product;
  /** Preços em ordem cronológica, da mesma oferta. */
  series: Cents[];
  fromCents: Cents;
  toCents: Cents;
}

async function withHistory(days: number, take: number): Promise<{ product: Product; series: Cents[] }[]> {
  const products = await loadCandidates(take);
  // Oferta de referência: a mais barata elegível de cada produto.
  const bestOffer = new Map<string, string>();
  const rows = await prisma.product.findMany({
    where: { id: { in: products.map((p) => p.id) } },
    include: productInclude,
  });
  const now = Date.now();
  for (const row of rows) {
    const best = mapProduct(row, now).offers.find(isEligible);
    if (best) bestOffer.set(row.id, best.id);
  }
  const since = new Date(now - days * 24 * 60 * 60 * 1000);
  const series = await loadSeries([...bestOffer.values()], since);
  return products.map((product) => ({
    product,
    series: (series.get(bestOffer.get(product.id) ?? "") ?? []).map((point) => point.cents),
  }));
}

/** Produtos cujo menor preço atual está abaixo do preço mais antigo dos últimos 30 dias. */
export async function listDrops(limit: number): Promise<DropView[]> {
  const items = await withHistory(30, 60);
  return items
    .flatMap(({ product, series }) => {
      const to = product.prices.lowestCents;
      const from = series[0];
      return to !== null && from !== undefined && from > to
        ? [{ product, series: [...series, to], fromCents: from, toCents: to }]
        : [];
    })
    .sort((a, b) => b.fromCents - b.toCents - (a.fromCents - a.toCents))
    .slice(0, limit);
}

export type DealKind = "destaque" | "quedas" | "minima" | "novas";

export const DEAL_KINDS: { slug: DealKind; label: string }[] = [
  { slug: "destaque", label: "Em destaque" },
  { slug: "quedas", label: "Maiores quedas" },
  { slug: "minima", label: "Menor preço registrado" },
  { slug: "novas", label: "Novas ofertas" },
];

const discount = (p: Product) =>
  p.prices.previousCents && p.prices.lowestCents && p.prices.previousCents > p.prices.lowestCents
    ? (p.prices.previousCents - p.prices.lowestCents) / p.prices.previousCents
    : 0;

export async function listDeals(kind: DealKind, limit = 48): Promise<Product[]> {
  if (kind === "quedas") return (await listDrops(limit)).map((drop) => drop.product);

  if (kind === "minima") {
    const items = await withHistory(366, 120);
    return items
      .filter(({ product, series }) => {
        const lowest = product.prices.lowestCents;
        // Só faz sentido com histórico: ao menos 3 registros e preço que já variou.
        return lowest !== null && series.length >= 3 && Math.min(...series) === lowest && Math.max(...series) > lowest;
      })
      .map(({ product }) => product)
      .slice(0, limit);
  }

  const products = await loadCandidates(limit * 2);
  if (kind === "novas") return products.slice(0, limit);
  return [...products].sort((a, b) => discount(b) - discount(a)).slice(0, limit);
}

/** Vitrine da home: maior desconto sobre o preço de referência da loja; depois os mais recentes. */
export async function listFeatured(limit: number): Promise<Product[]> {
  return listDeals("destaque", limit);
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

export async function listSitemapEntries() {
  const [rows, niches] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED", ...HAS_PUBLIC_OFFER },
      include: productInclude,
    }),
    prisma.niche.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const ids = rows.map((row) => row.id);
  const [contents, historicalIds] = await Promise.all([
    prisma.productContent.findMany({
      where: { productId: { in: ids }, status: "PUBLISHED" },
      select: { productId: true, sections: true },
    }),
    historicalOfferIds(ids),
  ]);
  const contentByProduct = new Map(contents.map((content) => [content.productId, content.sections]));
  const now = Date.now();
  const products = rows.filter((row) => {
    const sections = contentByProduct.get(row.id);
    const found: CatalogProduct = {
      ...mapProduct(row, now),
      content: sections ? asSections(sections) : null,
    };
    const mainOfferId = canonicalHistoryOfferId(found);
    return evaluateProductQuality(found, Boolean(mainOfferId && historicalIds.has(mainOfferId))).seoEligible;
  }).map(({ slug, updatedAt }) => ({ slug, updatedAt }));
  return { products, niches };
}
