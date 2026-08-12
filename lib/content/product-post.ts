import { Platform } from "@/lib/generated/prisma/client";

/**
 * Estrutura de dados e regras de docs/template-multicanal-posts-achadinhos.md
 * — a base única de fatos do produto a partir da qual cada canal monta seu
 * texto (lib/content/channel-formatters.ts). Nunca inventar preço anterior,
 * desconto ou benefícios: só entram aqui quando fornecidos.
 */
export type PostType = "PROMOTION" | "PRICE_DROP" | "FEATURED" | "NORMAL" | "NEW" | "FLASH_DEAL";
export type UrgencyLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export interface ProductPostFacts {
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
}

export interface ProductPostData {
  postType: PostType;
  productName: string;
  shortDescription: string;
  currentPrice: number;
  previousPrice?: number;
  discountPercent?: number;
  benefits: string[];
  marketplace: string;
  isTikTokShop: boolean;
  urgencyLevel: UrgencyLevel;
  disclosureFull: string;
  disclosureShort: string;
}

/** Links dos grupos do Telegram divulgados no rodapé dos posts de Facebook/Instagram. */
export const TELEGRAM_GROUP_LINK = "https://t.me/achadinhosblv";
export const TELEGRAM_TIKTOK_SHOP_GROUP_LINK = "https://t.me/tiktokshopblv";

export const DISCLOSURE_FULL =
  "*Link de afiliado. Podemos receber uma comissão se você realizar uma compra através deste link, sem custo adicional para você.";
export const DISCLOSURE_SHORT = "*Link de afiliado.";

const MARKETPLACE_LABEL: Record<Platform, string> = {
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
  AMAZON: "Amazon",
  ALIEXPRESS: "AliExpress",
  MAGALU: "Magalu",
  MERCADO_LIVRE: "Mercado Livre",
  OUTRAS: "loja parceira",
};

export function marketplaceLabel(source: Platform): string {
  return MARKETPLACE_LABEL[source];
}

const OPENING_BY_POST_TYPE: Record<PostType, string> = {
  PROMOTION: "🔥 OFERTA",
  PRICE_DROP: "📉 O PREÇO BAIXOU",
  FLASH_DEAL: "⏰ OFERTA POR TEMPO LIMITADO",
  FEATURED: "✨ PRODUTO EM DESTAQUE",
  NORMAL: "🛍️ ACHADINHO",
  NEW: "✨ NOVIDADE",
};

/** Aberturas específicas do Telegram (seção "Aberturas padronizadas" do template) — mais promocionais que o padrão genérico. */
const TELEGRAM_OPENING_BY_POST_TYPE: Record<PostType, string> = {
  PROMOTION: "🔥 OFERTA DO DIA",
  PRICE_DROP: "📉 PREÇO BAIXOU",
  FLASH_DEAL: "⏰ FLASH DEAL",
  FEATURED: "✨ PRODUTO EM DESTAQUE",
  NORMAL: "💥 ACHADO",
  NEW: "✨ PRODUTO EM DESTAQUE",
};

const CTA_LABEL_BY_POST_TYPE: Record<PostType, string> = {
  PROMOTION: "VER OFERTA",
  FLASH_DEAL: "VER OFERTA",
  PRICE_DROP: "CONFERIR PREÇO",
  FEATURED: "VER PRODUTO",
  NEW: "VER PRODUTO",
  NORMAL: "VER PRODUTO",
};

function defaultPostType(discountPercent?: number): PostType {
  return discountPercent && discountPercent >= 20 ? "PROMOTION" : "NORMAL";
}

function defaultUrgency(postType: PostType): UrgencyLevel {
  switch (postType) {
    case "FLASH_DEAL":
      return "HIGH";
    case "PROMOTION":
    case "PRICE_DROP":
      return "MEDIUM";
    case "FEATURED":
    case "NEW":
      return "LOW";
    default:
      return "NONE";
  }
}

/** Regra de preço do template: só existe preço anterior/desconto quando ambos vêm de dados reais e o desconto é positivo. */
function resolvePriceFacts(product: ProductPostFacts): { previousPrice?: number; discountPercent?: number } {
  if (!product.originalPrice || product.originalPrice <= product.price) return {};
  const discountPercent =
    product.discountPercent && product.discountPercent > 0
      ? product.discountPercent
      : Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  return { previousPrice: product.originalPrice, discountPercent };
}

export interface BuildProductPostDataInput {
  product: ProductPostFacts;
  marketplace: string;
  /** Plataforma de origem do produto — só usada para decidir se o link do grupo exclusivo do TikTok Shop entra no rodapé. */
  platform?: Platform;
  /** 1-3 frases; se ausente, os formatadores de canal simplesmente omitem a linha — nunca é inventada. */
  shortDescription?: string;
  /** Só características já confirmadas do produto; no máximo 3 são usadas. */
  benefits?: string[];
  postType?: PostType;
  urgencyLevel?: UrgencyLevel;
}

export function buildProductPostData(input: BuildProductPostDataInput): ProductPostData {
  const { previousPrice, discountPercent } = resolvePriceFacts(input.product);
  const postType = input.postType ?? defaultPostType(discountPercent);

  return {
    postType,
    productName: input.product.name,
    shortDescription: input.shortDescription?.trim() ?? "",
    currentPrice: input.product.price,
    previousPrice,
    discountPercent,
    benefits: (input.benefits ?? []).filter(Boolean).slice(0, 3),
    marketplace: input.marketplace,
    isTikTokShop: input.platform === Platform.TIKTOK_SHOP,
    urgencyLevel: input.urgencyLevel ?? defaultUrgency(postType),
    disclosureFull: DISCLOSURE_FULL,
    disclosureShort: DISCLOSURE_SHORT,
  };
}

export function openingFor(postType: PostType, channelStyle: "default" | "telegram" = "default"): string {
  return channelStyle === "telegram" ? TELEGRAM_OPENING_BY_POST_TYPE[postType] : OPENING_BY_POST_TYPE[postType];
}

export function ctaLabelFor(postType: PostType): string {
  return CTA_LABEL_BY_POST_TYPE[postType];
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "Regra de preço" do template: com promoção mostra DE/POR/OFF, sem promoção só o preço atual. */
export function formatPriceBlock(data: ProductPostData): string[] {
  if (data.previousPrice && data.discountPercent) {
    return [
      `💰 DE ${formatCurrency(data.previousPrice)}`,
      `🔥 POR ${formatCurrency(data.currentPrice)}`,
      `📉 ${data.discountPercent}% OFF`,
    ];
  }
  return [`💰 ${formatCurrency(data.currentPrice)}`];
}

export function formatBenefits(data: ProductPostData): string[] {
  return data.benefits.map((benefit) => `✅ ${benefit}`);
}

export interface ProductPostValidation {
  ok: boolean;
  missing: string[];
}

/** "Validação antes da publicação" do template — quando falta dado crítico, a publicação deve ficar bloqueada. */
export function validateProductPostData(data: ProductPostData, affiliateUrl?: string): ProductPostValidation {
  const missing: string[] = [];
  if (!data.productName) missing.push("Nome");
  if (!data.currentPrice) missing.push("Preço");
  if (!affiliateUrl) missing.push("URL afiliada");
  if (!data.marketplace) missing.push("Marketplace");

  if (data.postType === "PROMOTION" || data.postType === "PRICE_DROP" || data.postType === "FLASH_DEAL") {
    if (!data.previousPrice) missing.push("Preço anterior (obrigatório para post de promoção)");
    if (!data.discountPercent) missing.push("Desconto calculável (obrigatório para post de promoção)");
  }

  return { ok: missing.length === 0, missing };
}
