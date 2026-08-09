"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { PublicationStatus } from "@/lib/generated/prisma/client";

/**
 * Central de Grupos — "Marcar como publicado" (docs/especificacao-automacao-produtos-chartfm.md
 * §14): o admin já copiou o texto, abriu o grupo e publicou manualmente; esta
 * ação só registra o resultado, nunca chama a API do Facebook para grupos.
 */
export async function markGroupPublicationPublishedAction(projectSlug: string, publicationId: string) {
  await prisma.publication.update({
    where: { id: publicationId },
    data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
  });

  const publication = await prisma.publication.findUniqueOrThrow({ where: { id: publicationId } });
  if (publication.projectChannelId) {
    await prisma.projectChannel.update({ where: { id: publication.projectChannelId }, data: { lastPublishedAt: new Date() } });
  }

  revalidatePath(`/admin/afiliados/${projectSlug}/grupos`);
  revalidatePath(`/admin/afiliados/${projectSlug}/publicacoes`);
}

export async function skipGroupPublicationAction(projectSlug: string, publicationId: string) {
  await prisma.publication.update({ where: { id: publicationId }, data: { status: PublicationStatus.CANCELLED } });
  revalidatePath(`/admin/afiliados/${projectSlug}/grupos`);
}
