import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { PublicationStatus } from "@/lib/generated/prisma/client";
import { generateContentForProduct } from "@/lib/content";
import { resolveProjectChannel, PROJECT_SCOPED_CHANNELS } from "@/lib/publishing/resolve-project-channel";
import { getEligibleProducts } from "./eligible-products";

export interface RunScheduleSlotResult {
  productsSelected: number;
  publicationsCreated: number;
}

/**
 * Executa um ScheduleSlot: seleciona os produtos elegíveis, gera o conteúdo
 * (IA) e cria a Publication agendada para o horário do slot — respeitando a
 * operação semiautomática (spec §42): a publicação só acontece de fato
 * quando o conteúdo for aprovado e o schedulerTick encontrar o horário devido.
 */
export async function runScheduleSlot(slotId: string): Promise<RunScheduleSlotResult> {
  const slot = await prisma.scheduleSlot.findUniqueOrThrow({ where: { id: slotId } });

  const eligible = await getEligibleProducts(slot);

  const [hours, minutes] = slot.time.split(":").map(Number);
  const scheduledAt = new Date();
  scheduledAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

  let publicationsCreated = 0;

  for (const { productId } of eligible) {
    let projectChannelId: string | undefined;
    if (PROJECT_SCOPED_CHANNELS.has(slot.channel)) {
      const product = await prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { projectId: true } });
      const projectChannel = await resolveProjectChannel(product.projectId, slot.channel);
      if (!projectChannel) {
        logger.warn("JOB", `ScheduleSlot "${slot.name}": projeto sem canal ${slot.channel} configurado — pulando produto`, {
          slotId,
          productId,
          projectId: product.projectId,
        });
        continue;
      }
      projectChannelId = projectChannel.id;
    }

    const content = await generateContentForProduct({
      productId,
      channel: slot.channel,
      campaignId: slot.campaignId ?? undefined,
    });

    await prisma.publication.create({
      data: {
        contentId: content.id,
        channel: slot.channel,
        projectChannelId,
        status: PublicationStatus.QUEUED,
        scheduledAt,
      },
    });
    publicationsCreated += 1;
  }

  await prisma.scheduleSlot.update({ where: { id: slotId }, data: { lastRunAt: new Date() } });

  logger.info("JOB", `ScheduleSlot "${slot.name}" executado`, {
    slotId,
    productsSelected: eligible.length,
    publicationsCreated,
  });

  return { productsSelected: eligible.length, publicationsCreated };
}
