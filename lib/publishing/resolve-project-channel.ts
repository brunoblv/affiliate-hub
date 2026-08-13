import { prisma } from "@/lib/database";
import { Channel, ProjectChannelType, type ProjectChannel } from "@/lib/generated/prisma/client";

/** Canais com Página/grupo próprio por projeto — nunca podem cair num canal genérico de outro projeto. */
export const PROJECT_SCOPED_CHANNELS = new Set<Channel>([Channel.FACEBOOK, Channel.TELEGRAM, Channel.WHATSAPP]);

/**
 * Resolve o ProjectChannel de um projeto pra um canal — usado por qualquer
 * fluxo que enfileira Publication automaticamente (Autopilot, ScheduleSlot)
 * pra garantir que cada produto publica só na Página/grupo do próprio
 * projeto, nunca na de outro (bug real: publicações sem projectChannelId
 * caíam na "primeira Página" resolvida globalmente por resolvePublisher).
 * Facebook exige PUBLIC_PAGE — grupos são sempre fluxo assistido.
 */
export async function resolveProjectChannel(projectId: string, channel: Channel): Promise<ProjectChannel | null> {
  return prisma.projectChannel.findFirst({
    where: {
      projectId,
      active: true,
      platform: channel,
      ...(channel === Channel.FACEBOOK ? { type: ProjectChannelType.PUBLIC_PAGE } : {}),
    },
  });
}
