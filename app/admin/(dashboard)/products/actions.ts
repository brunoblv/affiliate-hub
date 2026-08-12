"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { Channel, EntityStatus, Platform } from "@/lib/generated/prisma/client";
import { runScoringPipeline } from "@/lib/scoring";
import { logger } from "@/lib/logging";

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Cadastro manual de produto (modo Manual do Autopilot, spec §27) — útil
 * também para testar o pipeline Produto → Score → Oportunidade sem depender
 * de uma integração de plataforma já aprovada.
 */
export async function createProductAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const price = parseNumber(formData.get("price"));
  if (price === undefined) throw new Error("Preço é obrigatório.");

  const originalPrice = parseNumber(formData.get("originalPrice"));
  const discountPercent =
    originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined;

  const categoryId = String(formData.get("categoryId") ?? "") || undefined;
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Projeto é obrigatório.");
  const source = String(formData.get("source") ?? "") as Platform;
  const slug = `${toSlug(name)}-${Date.now().toString(36)}`;

  const product = await prisma.product.create({
    data: {
      projectId,
      source: Object.values(Platform).includes(source) ? source : Platform.OUTRAS,
      externalId: slug,
      name,
      slug,
      description: String(formData.get("description") ?? "") || undefined,
      brand: String(formData.get("brand") ?? "") || undefined,
      categoryId,
      imageUrl: String(formData.get("imageUrl") ?? "") || undefined,
      productUrl: String(formData.get("productUrl") ?? "") || undefined,
      price,
      originalPrice,
      discountPercent,
      rating: parseNumber(formData.get("rating")),
      reviewCount: parseNumber(formData.get("reviewCount")),
      soldCount: parseNumber(formData.get("soldCount")),
      commissionPercent: parseNumber(formData.get("commissionPercent")),
    },
  });

  const { breakdown, opportunitiesCreated } = await runScoringPipeline(product.id, { isNew: true });

  logger.info("PRODUCT_SYNC", "Produto cadastrado manualmente", {
    productId: product.id,
    totalScore: breakdown.totalScore,
    opportunitiesCreated,
  });

  redirect("/admin/products");
}

/** Edição de produto (ação "Editar" da tela de produtos, spec §30) — recalcula o score após salvar. */
export async function updateProductAction(productId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const price = parseNumber(formData.get("price"));
  if (price === undefined) throw new Error("Preço é obrigatório.");

  const originalPrice = parseNumber(formData.get("originalPrice"));
  const discountPercent =
    originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined;

  const categoryId = String(formData.get("categoryId") ?? "") || undefined;

  await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      description: String(formData.get("description") ?? "") || undefined,
      brand: String(formData.get("brand") ?? "") || undefined,
      categoryId: categoryId ?? null,
      imageUrl: String(formData.get("imageUrl") ?? "") || undefined,
      productUrl: String(formData.get("productUrl") ?? "") || undefined,
      price,
      originalPrice,
      discountPercent,
      rating: parseNumber(formData.get("rating")),
      reviewCount: parseNumber(formData.get("reviewCount")),
      soldCount: parseNumber(formData.get("soldCount")),
      commissionPercent: parseNumber(formData.get("commissionPercent")),
    },
  });

  const { breakdown, opportunitiesCreated } = await runScoringPipeline(productId);

  logger.info("PRODUCT_SYNC", "Produto editado manualmente", {
    productId,
    totalScore: breakdown.totalScore,
    opportunitiesCreated,
  });

  redirect(`/admin/products/${productId}`);
}

/** Ação "Bloquear"/"Reativar" da tela de produtos (spec §30) — impede novas divulgações do produto. */
export async function toggleProductStatusAction(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const nextStatus = product.status === EntityStatus.BLOCKED ? EntityStatus.ACTIVE : EntityStatus.BLOCKED;

  await prisma.product.update({ where: { id: productId }, data: { status: nextStatus } });

  logger.info("PRODUCT_SYNC", `Produto ${nextStatus === EntityStatus.BLOCKED ? "bloqueado" : "reativado"}`, { productId });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
}

/**
 * Ação "Criar link" da tela de produtos (spec §30/§10). Em operação manual,
 * o admin cola aqui o link de afiliado já gerado no painel da própria
 * plataforma (Mercado Livre/Shopee/TikTok/Amazon) — o rastreamento próprio
 * via /go/:code funciona independentemente da automação de geração de link
 * estar pronta ou não.
 *
 * Quando o canal é Facebook, dispara a publicação automática (Página + fila
 * de grupos + blog), docs/especificacao-automacao-produtos-chartfm.md §13/§14
 * — mesmo esquema seja o produto do Mercado Livre/TikTok ou cadastrado
 * manualmente (Amazon/Shopee, spec §5).
 */
export async function createAffiliateLinkAction(productId: string, formData: FormData) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const affiliateUrl = String(formData.get("affiliateUrl") ?? "").trim();
  if (!affiliateUrl) throw new Error("URL de afiliado é obrigatória.");

  const channel = String(formData.get("channel") ?? "") as Channel;
  if (!Object.values(Channel).includes(channel)) throw new Error("Canal inválido.");

  const subId = String(formData.get("subId") ?? "").trim() || undefined;

  if (channel === Channel.FACEBOOK) {
    const { attachAffiliateLinkAndPublish } = await import("@/lib/affiliate/attach-link");
    await attachAffiliateLinkAndPublish({ productId, affiliateUrl, subId });
  } else if (channel === Channel.TELEGRAM || channel === Channel.WHATSAPP) {
    const link = await prisma.affiliateLink.create({
      data: { productId, platform: product.source, channel, affiliateUrl, subId },
    });
    const { publishToChannelGroups } = await import("@/lib/affiliate/publish-to-channel-group");
    await publishToChannelGroups(product, link, channel);
  } else {
    await prisma.affiliateLink.create({
      data: { productId, platform: product.source, channel, affiliateUrl, subId },
    });
  }

  logger.info("AFFILIATE_SYNC", "Link de afiliado criado manualmente", { productId, channel });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/afiliados");
}

/**
 * Registro manual de venda/comissão (spec §3 "Consolidar vendas e comissões
 * disponíveis nas plataformas") — usado enquanto a sincronização automática
 * de relatórios da Shopee/TikTok não está disponível.
 */
export async function registerConversionAction(linkId: string, formData: FormData) {
  const commission = parseNumber(formData.get("commission"));
  if (commission === undefined) throw new Error("Valor da comissão é obrigatório.");

  const link = await prisma.affiliateLink.update({
    where: { id: linkId },
    data: { conversions: { increment: 1 }, commission: { increment: commission } },
  });

  logger.info("AFFILIATE_SYNC", "Conversão registrada manualmente", { linkId, commission });

  revalidatePath(`/admin/products/${link.productId}`);
  revalidatePath("/admin/analytics/conversions");
  revalidatePath("/admin/analytics/commissions");
}
