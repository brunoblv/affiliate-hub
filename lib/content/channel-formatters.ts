import { Channel } from "@/lib/generated/prisma/client";
import {
  type ProductPostData,
  ctaLabelFor,
  formatBenefits,
  formatCurrency,
  formatPriceBlock,
  openingFor,
} from "./product-post";

/**
 * Monta o texto pronto de cada canal a partir de ProductPostData, seguindo a
 * ordem/regras de docs/template-multicanal-posts-achadinhos.md. `affiliateUrl`
 * ausente usa o placeholder "[LINK]" do próprio template (ex: conteúdo em
 * rascunho, antes de existir um link cadastrado).
 */
export interface ChannelPost {
  headline: string;
  /** Preço + descrição curta + benefícios — sem CTA, link ou disclosure. */
  body: string;
  cta: string;
  disclosure: string;
  /** Texto completo, pronto para copiar/colar (ou publicar via API). */
  fullText: string;
  /** Só Instagram Feed: sugestão de texto para a arte (imagem), separado da legenda. */
  art?: string;
  /** Só Instagram Feed: legenda (igual a `fullText` nesse canal). */
  caption?: string;
  /** Só Instagram Stories: sequência de 3 telas. */
  storySequence?: [string, string, string];
}

const LINK_PLACEHOLDER = "[LINK]";

function joinLines(lines: Array<string | false | undefined>): string {
  return lines.filter((line): line is string => typeof line === "string").join("\n");
}

function linkLine(affiliateUrl?: string): string {
  return affiliateUrl || LINK_PLACEHOLDER;
}

function formatWhatsApp(data: ProductPostData, affiliateUrl?: string): ChannelPost {
  const headline = openingFor(data.postType);
  const priceLines = formatPriceBlock(data);
  const benefitLines = formatBenefits(data);
  const cta = `👉 ${ctaLabelFor(data.postType)}`;
  const disclosure = data.disclosureShort;

  const body = joinLines([
    data.productName,
    "",
    ...priceLines,
    Boolean(data.shortDescription) && "",
    data.shortDescription || undefined,
    benefitLines.length > 0 && "",
    ...benefitLines,
  ]);

  const fullText = joinLines([headline, "", body, "", cta, linkLine(affiliateUrl), "", "⚠️ Preço pode mudar.", disclosure]);

  return { headline, body, cta, disclosure, fullText };
}

function formatTelegram(data: ProductPostData, affiliateUrl?: string): ChannelPost {
  const headline = openingFor(data.postType, "telegram");
  const priceLines = formatPriceBlock(data);
  const benefitLines = formatBenefits(data);
  const cta = `🛒 👉 ${ctaLabelFor(data.postType)}`;
  const disclosure = data.disclosureShort;

  const body = joinLines([
    data.productName,
    "",
    ...priceLines,
    Boolean(data.shortDescription) && "",
    data.shortDescription || undefined,
    benefitLines.length > 0 && "",
    ...benefitLines,
  ]);

  const fullText = joinLines([headline, "", body, "", cta, linkLine(affiliateUrl), "", "⏰ Pode mudar sem aviso.", disclosure]);

  return { headline, body, cta, disclosure, fullText };
}

function formatFacebook(data: ProductPostData, affiliateUrl?: string): ChannelPost {
  const headline = openingFor(data.postType);
  const priceLines = formatPriceBlock(data);
  const benefitLines = formatBenefits(data);
  const cta = `👉 Confira a oferta:`;
  const disclosure = data.disclosureShort;

  const body = joinLines([
    data.productName,
    "",
    ...priceLines,
    Boolean(data.shortDescription) && "",
    data.shortDescription || undefined,
    benefitLines.length > 0 && "",
    ...benefitLines,
  ]);

  const fullText = joinLines([
    headline,
    "",
    body,
    "",
    cta,
    linkLine(affiliateUrl),
    "",
    "⚠️ Valores e disponibilidade podem mudar.",
    disclosure,
  ]);

  return { headline, body, cta, disclosure, fullText };
}

function formatInstagramFeed(data: ProductPostData, affiliateUrl?: string): ChannelPost {
  const headline = openingFor(data.postType);
  const disclosure = data.disclosureShort;
  const benefitLines = formatBenefits(data);
  const cta = "🔗 Confira no link da bio.";

  // Sugestão de texto para a arte/imagem — mais enxuto, sem emoji no bloco de preço (fica a cargo do design).
  const art = joinLines([
    headline,
    "",
    data.productName,
    "",
    data.previousPrice ? `DE ${formatCurrency(data.previousPrice)}` : undefined,
    data.previousPrice ? `POR ${formatCurrency(data.currentPrice)}` : `${formatCurrency(data.currentPrice)}`,
    data.discountPercent ? `${data.discountPercent}% OFF` : undefined,
  ]);

  const body = joinLines([
    data.shortDescription || undefined,
    Boolean(data.shortDescription) && "",
    `O ${data.productName} está por ${formatCurrency(data.currentPrice)}.`,
    benefitLines.length > 0 && "",
    ...benefitLines,
  ]);

  const caption = joinLines([body, "", cta, "", "⚠️ Preço sujeito a alteração.", disclosure]);

  // affiliateUrl não entra na legenda (Instagram não permite link clicável em texto) — fica só registrado para reuso futuro (ex: link da bio/stories).
  void affiliateUrl;

  return { headline, body, cta, disclosure, fullText: caption, art, caption };
}

function formatInstagramStories(data: ProductPostData, affiliateUrl?: string): ChannelPost {
  const headline = openingFor(data.postType);
  const priceLines = formatPriceBlock(data);
  const cta = `🛒 ${ctaLabelFor(data.postType)}`;
  const disclosure = data.disclosureShort;

  const story1 = headline;
  const story2 = joinLines([data.productName, "", ...priceLines]);
  const story3 = joinLines([cta, "", linkLine(affiliateUrl)]);

  return {
    headline,
    body: story2,
    cta,
    disclosure,
    fullText: joinLines([story1, "---", story2, "---", story3]),
    storySequence: [story1, story2, story3],
  };
}

/** Fallback genérico para canais sem seção própria no template (TikTok, Pinterest, site, outros). */
function formatGeneric(data: ProductPostData, affiliateUrl?: string): ChannelPost {
  const headline = openingFor(data.postType);
  const priceLines = formatPriceBlock(data);
  const benefitLines = formatBenefits(data);
  const cta = `👉 ${ctaLabelFor(data.postType)}`;
  const disclosure = data.disclosureShort;

  const body = joinLines([
    data.productName,
    "",
    ...priceLines,
    Boolean(data.shortDescription) && "",
    data.shortDescription || undefined,
    benefitLines.length > 0 && "",
    ...benefitLines,
  ]);

  const fullText = joinLines([headline, "", body, "", cta, linkLine(affiliateUrl), "", disclosure]);

  return { headline, body, cta, disclosure, fullText };
}

export function formatForChannel(channel: Channel, data: ProductPostData, affiliateUrl?: string): ChannelPost {
  switch (channel) {
    case Channel.WHATSAPP:
      return formatWhatsApp(data, affiliateUrl);
    case Channel.TELEGRAM:
      return formatTelegram(data, affiliateUrl);
    case Channel.FACEBOOK:
      return formatFacebook(data, affiliateUrl);
    case Channel.INSTAGRAM:
      return formatInstagramFeed(data, affiliateUrl);
    case Channel.TIKTOK:
    case Channel.WEBSITE:
    case Channel.BLOG:
    case Channel.PINTEREST:
    case Channel.OUTROS:
      return formatGeneric(data, affiliateUrl);
    default:
      return formatGeneric(data, affiliateUrl);
  }
}

export { formatInstagramStories };
