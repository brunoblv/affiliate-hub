import type { Prisma } from "@/lib/generated/prisma/client";
import { money } from "@/lib/format";
import { affiliateTrackingUrl, fingerprint, telegramTarget, DAY } from "./rules";

export class DistributionError extends Error {}
function reject(message: string): never { throw new DistributionError(message); }

export type Selection = { communityId: string; linkId: string; creativeId?: string | null };

/** A oferta e o link são escolhidos pelo admin. Nunca substituir pela oferta mais barata. */
export async function preparePublication(db: Prisma.TransactionClient, selection: Selection, now = new Date()) {
  const community = await db.community.findUnique({ where: { id: selection.communityId }, include: { niche: true } });
  if (!community?.active || !community.niche.active || community.platform !== "TELEGRAM") reject("Escolha uma comunidade Telegram ativa de um nicho ativo.");
  const targetId = telegramTarget(community.publicationId);
  if (!targetId) reject("Cadastre o ID numérico negativo do grupo/canal Telegram em Comunidades.");
  const link = await db.affiliateLink.findUnique({ where: { id: selection.linkId }, include: { offer: { include: { store: true, variant: { include: { product: { include: { niches: true, variants: true } } } } } } } });
  if (!link?.active) reject("O link afiliado não está ativo.");
  const offer = link.offer, product = offer.variant.product;
  if (!offer.active || !offer.store.active || product.status !== "PUBLISHED" || !product.niches.some((item) => item.nicheId === community.nicheId)) reject("Produto/oferta indisponível ou fora do nicho escolhido.");
  if (!offer.priceCents || offer.priceCents <= 0 || !offer.priceCheckedAt || offer.priceCheckedAt > now || now.getTime() - offer.priceCheckedAt.getTime() >= DAY || offer.status !== "ACTIVE" || offer.needsReview || offer.availability !== "IN_STOCK") reject("A oferta precisa de estoque confirmado e preço conferido nas últimas 24 horas, sem erro ou revisão pendente. Atualize em Preços/Ofertas.");
  let affiliate: URL;
  try { affiliate = new URL(link.url); } catch { return reject("Link afiliado inválido."); }
  if (!["https:", "http:"].includes(affiliate.protocol) || affiliate.username || affiliate.password) reject("Link afiliado inválido.");
  const trackingUrl = affiliateTrackingUrl(process.env.NEXT_PUBLIC_SITE_URL, link.shortCode);
  const creative = selection.creativeId ? await db.creative.findUnique({ where: { id: selection.creativeId } }) : null;
  if (selection.creativeId && (!creative || creative.productId !== product.id || !["APPROVED", "PUBLISHED"].includes(creative.status))) reject("Escolha uma capa aprovada deste produto.");
  // O template legado não identifica variante/condição. Não divulgar uma imagem ambígua.
  if (creative && (product.variants.length !== 1 || offer.condition !== "NEW")) reject("Capas atuais só podem acompanhar produtos de variação única e novos. Use texto para esta oferta.");
  if (creative?.withPrice && (creative.priceCents !== offer.priceCents || offer.priceCondition || !creative.priceObservedAt || now.getTime() - creative.priceObservedAt.getTime() >= DAY || creative.priceObservedAt > now)) reject("A capa tem preço/condição/data incompatível com a oferta. Gere e aprove outra capa ou publique somente texto.");
  // Neutraliza URLs vindas de nomes/atributos externos: o único link no texto é /go.
  const label = (value: string) => value.replace(/(?:https?:\/\/|www\.)\S+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi, "").replace(/[\r\n]+/g, " ").trim();
  const shipping = offer.shippingKind === "FREE" ? "Frete grátis informado pela loja."
    : offer.shippingKind === "PAID" && offer.shippingCents !== null ? `Frete informado: ${money(offer.shippingCents)}; confirme para seu endereço.`
    : "Preço sem frete. Consulte frete e condições na loja.";
  const text = [label(product.name), `Variação: ${label(offer.variant.label)} · ${offer.condition === "NEW" ? "Novo" : "Usado"}`,
    `${money(offer.priceCents)}${offer.priceCondition ? ` (${label(offer.priceCondition)})` : ""}`,
    `${label(offer.store.name)} · Vendedor: ${label(offer.sellerName)}`, shipping,
    `Conferido em ${offer.priceCheckedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília).`,
    "Preço e disponibilidade finais na loja. Link de afiliado: podemos receber comissão.", trackingUrl].join("\n");
  if (text.length > (creative ? 1024 : 4096)) reject("Texto excede o limite do Telegram. Revise os dados do produto ou remova a capa.");
  // Uma coleta sem mudança não exige nova aprovação. Preço/condição/link/destino/capa exigem.
  const hash = fingerprint({ name: product.name, variant: offer.variant.label, price: offer.priceCents, condition: offer.priceCondition,
    itemCondition: offer.condition, shipping: [offer.shippingKind, offer.shippingCents], seller: offer.sellerName,
    store: offer.store.name, affiliateUrl: link.url, trackingUrl, targetId, nicheId: community.nicheId,
    creative: creative ? [creative.id, creative.file, creative.priceCents, creative.priceObservedAt?.toISOString()] : null });
  return { communityId: community.id, nicheId: community.nicheId, productId: product.id, offerId: offer.id, linkId: link.id,
    creativeId: creative?.id ?? null, title: product.name, text, targetId: targetId!, priceCents: offer.priceCents,
    priceObservedAt: offer.priceCheckedAt, fingerprint: hash };
}
