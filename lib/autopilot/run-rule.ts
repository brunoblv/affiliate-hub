import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { AutopilotMode, ContentStatus, PublicationStatus } from "@/lib/generated/prisma/client";
import { generateContentForProduct } from "@/lib/content";
import { getEligibleProducts } from "./eligible-products";
import { nextAvailableTime } from "./next-available-time";

export interface RunAutopilotRuleResult {
  productsSelected: number;
  publicationsCreated: number;
}

/**
 * Executa uma AutopilotRule em modo AUTOMATIC (spec §27/§28): score + regras
 * → IA → conteúdo já aprovado automaticamente → campanha → fila de
 * publicação no próximo horário disponível. Diferente do fluxo
 * semiautomático, aqui não há espera por aprovação humana.
 */
export async function runAutopilotRule(ruleId: string): Promise<RunAutopilotRuleResult> {
  const rule = await prisma.autopilotRule.findUniqueOrThrow({ where: { id: ruleId } });

  if (!rule.active || rule.mode !== AutopilotMode.AUTOMATIC) {
    return { productsSelected: 0, publicationsCreated: 0 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const publishedToday = await prisma.publication.count({
    where: { channel: rule.channel, createdAt: { gte: todayStart } },
  });

  const remainingQuota = (rule.maxPublicationsPerDay ?? 10) - publishedToday;
  const eligible = await getEligibleProducts(rule, remainingQuota);

  let publicationsCreated = 0;

  for (const { productId } of eligible) {
    const content = await generateContentForProduct({
      productId,
      channel: rule.channel,
      campaignId: rule.targetCampaignId ?? undefined,
    });

    // Autopilot em modo automático aprova o conteúdo sozinho — sem gate humano.
    await prisma.content.update({ where: { id: content.id }, data: { status: ContentStatus.APPROVED } });

    if (rule.targetCampaignId) {
      await prisma.campaignProduct.upsert({
        where: { campaignId_productId: { campaignId: rule.targetCampaignId, productId } },
        create: { campaignId: rule.targetCampaignId, productId },
        update: {},
      });
    }

    const scheduledAt = await nextAvailableTime(rule.channel);

    await prisma.publication.create({
      data: { contentId: content.id, channel: rule.channel, status: PublicationStatus.QUEUED, scheduledAt },
    });

    publicationsCreated += 1;
  }

  logger.info("AUTOPILOT", `Regra "${rule.name}" executada`, {
    ruleId,
    productsSelected: eligible.length,
    publicationsCreated,
  });

  return { productsSelected: eligible.length, publicationsCreated };
}
