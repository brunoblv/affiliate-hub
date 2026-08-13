"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { Channel, ContentStatus, ContentType, PublicationStatus } from "@/lib/generated/prisma/client";

/**
 * Cadastro manual de post do TikTok (fluxo assistido, mesmo esquema da
 * Central de Grupos do Facebook — lib/affiliate/publish-to-facebook.ts): o
 * TikTok Shop não tem versão web pra automatizar e a Content Posting API
 * exige escopo separado, então o admin preenche as informações aqui e o
 * sistema só guarda na fila; a postagem em si é feita manualmente no app.
 */
export async function createTikTokPostAction(projectSlug: string, formData: FormData) {
  const project = await getProjectBySlug(projectSlug);

  const caption = String(formData.get("caption") ?? "").trim();
  if (!caption) throw new Error("Legenda é obrigatória.");

  const productId = String(formData.get("productId") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "").trim() || undefined;
  const hashtags = String(formData.get("hashtags") ?? "").trim() || undefined;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim() || undefined;
  const affiliateUrl = String(formData.get("affiliateUrl") ?? "").trim() || undefined;
  let imageUrl = String(formData.get("imageUrl") ?? "").trim() || undefined;

  if (!imageUrl && productId) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { imageUrl: true } });
    imageUrl = product?.imageUrl ?? undefined;
  }

  const content = await prisma.content.create({
    data: {
      projectId: project.id,
      productId,
      type: ContentType.TIKTOK_VIDEO,
      title,
      description: affiliateUrl,
      caption,
      hashtags,
      imageUrl,
      videoUrl,
      status: ContentStatus.APPROVED,
    },
  });

  await prisma.publication.create({
    data: {
      contentId: content.id,
      channel: Channel.TIKTOK,
      assisted: true,
      status: PublicationStatus.QUEUED,
      scheduledAt: new Date(),
    },
  });

  revalidatePath(`/admin/afiliados/${projectSlug}/tiktok`);
  revalidatePath(`/admin/afiliados/${projectSlug}/publicacoes`);

  redirect(`/admin/afiliados/${projectSlug}/tiktok?created=1`);
}

/** "Marcar como publicado" — o admin já postou manualmente no app do TikTok. */
export async function markTikTokPublicationPublishedAction(projectSlug: string, publicationId: string) {
  await prisma.publication.update({
    where: { id: publicationId },
    data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
  });

  revalidatePath(`/admin/afiliados/${projectSlug}/tiktok`);
  revalidatePath(`/admin/afiliados/${projectSlug}/publicacoes`);
}

export async function skipTikTokPublicationAction(projectSlug: string, publicationId: string) {
  await prisma.publication.update({ where: { id: publicationId }, data: { status: PublicationStatus.CANCELLED } });
  revalidatePath(`/admin/afiliados/${projectSlug}/tiktok`);
}
