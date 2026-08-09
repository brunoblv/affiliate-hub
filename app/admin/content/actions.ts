"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { Channel, ContentStatus, PublicationStatus } from "@/lib/generated/prisma/client";
import { generateContentForProduct, CONTENT_TYPE_TO_CHANNEL } from "@/lib/content";
import { executePublication } from "@/lib/publishing";
import { logger } from "@/lib/logging";

/** Ação "Gerar conteúdo" (produto ou oportunidade, spec §31/§32). */
export async function generateContentAction(productId: string, formData: FormData) {
  const channel = String(formData.get("channel") ?? "") as Channel;
  if (!Object.values(Channel).includes(channel)) throw new Error("Canal inválido.");

  const campaignId = String(formData.get("campaignId") ?? "") || undefined;

  const content = await generateContentForProduct({ productId, channel, campaignId });

  redirect(`/admin/content/${content.id}`);
}

/** Edição manual do conteúdo gerado (spec §32: título, descrição, CTA/caption, hashtags). */
export async function updateContentAction(contentId: string, formData: FormData) {
  await prisma.content.update({
    where: { id: contentId },
    data: {
      title: String(formData.get("title") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
      caption: String(formData.get("caption") ?? "") || undefined,
      hashtags: String(formData.get("hashtags") ?? "") || undefined,
      imageUrl: String(formData.get("imageUrl") ?? "") || undefined,
    },
  });

  revalidatePath(`/admin/content/${contentId}`);
}

/** Regenera o texto a partir do produto vinculado (ação "Regenerar texto", spec §32). */
export async function regenerateContentAction(contentId: string) {
  const content = await prisma.content.findUniqueOrThrow({ where: { id: contentId } });
  if (!content.productId) throw new Error("Conteúdo sem produto vinculado não pode ser regenerado.");

  const channel = CONTENT_TYPE_TO_CHANNEL[content.type];
  const regenerated = await generateContentForProduct({
    productId: content.productId,
    channel,
    campaignId: content.campaignId ?? undefined,
  });

  // A geração cria um novo Content; copiamos o resultado para o registro atual e removemos o duplicado.
  await prisma.content.update({
    where: { id: contentId },
    data: {
      title: regenerated.title,
      description: regenerated.description,
      caption: regenerated.caption,
      hashtags: regenerated.hashtags,
    },
  });
  await prisma.content.delete({ where: { id: regenerated.id } });

  logger.info("CONTENT", "Conteúdo regenerado", { contentId });
  revalidatePath(`/admin/content/${contentId}`);
}

/** Duplica o conteúdo como novo rascunho (ação "Duplicar conteúdo", spec §32). */
export async function duplicateContentAction(contentId: string) {
  const content = await prisma.content.findUniqueOrThrow({ where: { id: contentId } });

  const duplicate = await prisma.content.create({
    data: {
      productId: content.productId,
      campaignId: content.campaignId,
      type: content.type,
      title: content.title,
      description: content.description,
      caption: content.caption,
      hashtags: content.hashtags,
      imageUrl: content.imageUrl,
      videoUrl: content.videoUrl,
      status: ContentStatus.DRAFT,
    },
  });

  redirect(`/admin/content/${duplicate.id}`);
}

/** Aprovação/reprovação do conteúdo (fluxo semiautomático, spec §27). */
export async function setContentStatusAction(contentId: string, status: ContentStatus) {
  await prisma.content.update({ where: { id: contentId }, data: { status } });
  revalidatePath(`/admin/content/${contentId}`);
  revalidatePath("/admin/content");
}

/**
 * Publica o conteúdo imediatamente (ação "Publicar imediatamente", spec §32).
 * Cria a Publication e já tenta publicar de verdade via o Publisher do canal
 * — sem depender do worker/BullMQ estar rodando.
 */
export async function publishNowAction(contentId: string) {
  const content = await prisma.content.findUniqueOrThrow({ where: { id: contentId } });
  const channel = CONTENT_TYPE_TO_CHANNEL[content.type];

  const publication = await prisma.publication.create({
    data: { contentId, channel, status: PublicationStatus.QUEUED, scheduledAt: new Date() },
  });

  try {
    await executePublication(publication.id);
    await prisma.content.update({ where: { id: contentId }, data: { status: ContentStatus.PUBLISHED } });
  } catch {
    // O erro já foi persistido em Publication.error por executePublication; a UI exibe a partir de lá.
  }

  revalidatePath(`/admin/content/${contentId}`);
  revalidatePath("/admin/publications");
}
