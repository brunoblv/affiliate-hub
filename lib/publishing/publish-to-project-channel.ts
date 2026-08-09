import { prisma } from "@/lib/database";
import { withRetry } from "@/lib/integrations/retry";
import { logger } from "@/lib/logging";
import { PublicationStatus } from "@/lib/generated/prisma/client";
import { FacebookPublisher } from "./meta-publisher";

/**
 * Publica uma Publication numa Página do Facebook específica, escolhida pelo
 * `externalPageId` do ProjectChannel — diferente de `executePublication`
 * (lib/publishing/execute-publication.ts), que sempre usa a primeira Página
 * conectada. Necessário porque cada projeto (Umbanda, Casa, ChartFM) publica
 * na sua própria Página.
 */
export async function publishToProjectChannel(publicationId: string, pageId: string): Promise<void> {
  const publication = await prisma.publication.findUniqueOrThrow({
    where: { id: publicationId },
    include: { content: true },
  });

  await prisma.publication.update({
    where: { id: publicationId },
    data: { status: PublicationStatus.PUBLISHING, attempts: { increment: 1 } },
  });

  try {
    const publisher = new FacebookPublisher(pageId);
    const result = await withRetry(() => publisher.publish(publication.content));

    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date(), externalPostId: result.externalPostId },
    });

    logger.info("PUBLISH", "Facebook: post automático publicado na Página do projeto", { publicationId, pageId });
  } catch (error) {
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: PublicationStatus.FAILED, error: error instanceof Error ? error.message : String(error) },
    });
    logger.error("PUBLISH", "Facebook: falha ao publicar automaticamente na Página do projeto", {
      publicationId,
      pageId,
      error,
    });
    throw error;
  }
}
