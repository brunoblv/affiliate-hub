import { prisma } from "@/lib/database";
import { withRetry } from "@/lib/integrations/retry";
import { logger } from "@/lib/logging";
import { PublicationStatus } from "@/lib/generated/prisma/client";
import { resolvePublisher } from "./resolve-publisher";
import { getPublisher } from "./get-publisher";
import { PROJECT_SCOPED_CHANNELS } from "./resolve-project-channel";

/**
 * Executa uma Publication já existente: resolve o Publisher do canal,
 * publica com retry e atualiza o status (spec §18/§19). Reaproveitada tanto
 * pelo worker da fila `publication` quanto pela publicação manual imediata
 * ("Publicar agora" na tela de conteúdo).
 */
export async function executePublication(publicationId: string): Promise<void> {
  const publication = await prisma.publication.findUniqueOrThrow({
    where: { id: publicationId },
    include: { content: true, projectChannel: true },
  });

  await prisma.publication.update({
    where: { id: publicationId },
    data: { status: PublicationStatus.PUBLISHING, attempts: { increment: 1 } },
  });

  try {
    // Facebook/Telegram/WhatsApp têm Página/grupo próprio por projeto — nunca
    // podem cair no "primeiro canal genérico" (bug real: publicava produto de
    // um projeto na Página do Facebook de outro projeto).
    if (!publication.projectChannel && PROJECT_SCOPED_CHANNELS.has(publication.channel)) {
      throw new Error(
        `Publication sem projectChannel pra canal ${publication.channel} — recusando publicar num canal genérico pra não postar no projeto errado.`,
      );
    }

    const publisher = publication.projectChannel
      ? getPublisher(publication.channel, {
          pageId: publication.projectChannel.externalPageId ?? undefined,
          chatId: publication.projectChannel.externalChatId ?? undefined,
        })
      : await resolvePublisher(publication.channel);

    const result = await withRetry(() => publisher.publish(publication.content));

    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date(), externalPostId: result.externalPostId },
    });

    logger.info("PUBLISH", `${publication.channel}: sucesso`, { publicationId });
  } catch (error) {
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: PublicationStatus.FAILED, error: error instanceof Error ? error.message : String(error) },
    });
    logger.error("PUBLISH", `${publication.channel}: falhou`, { publicationId, error });
    throw error;
  }
}
