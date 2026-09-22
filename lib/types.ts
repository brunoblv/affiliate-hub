import type { Cents } from "./format";

export type CollectionMethod = "API" | "SCRAPER" | "MANUAL";
export type OfferStatus = "ativo" | "desatualizado" | "erro";
export type Availability = "em_estoque" | "sem_estoque" | "desconhecida";
export type JobStatus = "atualizado" | "processando" | "pendente" | "erro";
export type StoreHealth = "operacional" | "lento" | "problemas";

export interface Store {
  id: string;
  name: string;
  /** Preferred collection method for this store's connector (RF-07). */
  method: CollectionMethod;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  /** Key into the icon registry in `components/category-icon.tsx`. */
  icon: string;
}

export interface Shipping {
  kind: "gratis" | "valor" | "condicional" | "desconhecido";
  /** Only set when `kind === "valor"`. */
  cents?: Cents;
  label: string;
}

export interface Offer {
  id: string;
  productId: string;
  variantId: string;
  storeId: string;
  /** The seller inside the marketplace — several per store are expected. */
  seller: string;
  priceCents: Cents;
  /** Store-reported reference price, when there is one. */
  previousPriceCents?: Cents;
  /** Number of interest-free installments, when the store reports it. */
  installments: number | null;
  /** Total when paying in installments; null means same as priceCents. */
  installmentPriceCents: Cents | null;
  /** What the cash price requires, e.g. "Pix" or "NuPay". */
  priceCondition: string | null;
  shipping: Shipping;
  availability: Availability;
  method: CollectionMethod;
  status: OfferStatus;
  /** Minutes since the last successful collection. */
  collectedMinutesAgo: number;
  /** Public code behind /go/[code]; only offers with an active affiliate link are public. */
  shortCode: string;
}

export interface Variant {
  id: string;
  label: string;
  attributes: Record<string, string>;
}

export interface Spec {
  key: string;
  /** `null` renders as "—" rather than inventing a value. */
  value: string | null;
}

export interface PriceSummary {
  lowestCents: Cents | null;
  highestCents: Cents | null;
  /** Reference price of the cheapest eligible offer, when the store reports one. */
  previousCents: Cents | null;
  offerCount: number;
  /** Distinct stores — deliberately a different number from offerCount. */
  storeCount: number;
  freshestMinutesAgo: number | null;
  /** Installment plan of the cheapest eligible offer. */
  installmentTimes: number | null;
  installmentTotalCents: Cents | null;
  priceCondition: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  gtin: string;
  /** Slug of the product's main niche ("" when it has none). */
  categorySlug: string;
  summary: string;
  /** Verified marketplace rating, or null when there is no evidence. */
  rating: number | null;
  reviewCount: number | null;
  imageCount: number;
  /** Cover first. Empty when no photo was registered. */
  images: { url: string; alt: string; variantId: string | null }[];
  variants: Variant[];
  specs: Spec[];
  /** Across all variants: the card says "a partir de" when there is more than one. */
  prices: PriceSummary;
}

export interface PriceSeries {
  /** Daily observations in cents, oldest first. */
  "30d": Cents[];
  "90d": Cents[];
  "6m": Cents[];
  "1a": Cents[];
}

export type RangeKey = keyof PriceSeries;

export interface SyncJob {
  id: string;
  storeId: string;
  offerLabel: string;
  method: CollectionMethod;
  lastAttemptMinutesAgo: number;
  status: JobStatus;
  /** Human label; "manual" when the offer has no automatic schedule. */
  next: string;
}

export interface StoreStatus {
  storeId: string;
  offerCount: number;
  syncedMinutesAgo: number;
  health: StoreHealth;
}

export interface PriceAlert {
  productSlug: string;
  productName: string;
  targetCents: Cents;
  currentCents: Cents;
}

export interface Favorite {
  productSlug: string;
  productName: string;
  savedAtCents: Cents;
  currentCents: Cents;
}
