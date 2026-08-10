import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { AutopilotMode, ContentStatus, PublicationStatus } from "@/lib/generated/prisma/client";
import { executePublication } from "@/lib/publishing";
import { runAutopilotRule } from "@/lib/autopilot";
import { maybeRunDailyDiscovery } from "@/lib/discovery";
import { runScheduleSlot } from "./run-slot";
import { runDuePublishJobs } from "./publish-queue";

function currentTimeHHmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/**
 * Executado periodicamente (spec §24 "Cron ↓ product-sync ↓ BullMQ ↓ Worker"):
 * 1. Processa jobs de publicação de link de afiliado agendados (fila
 *    "affiliate-publish") cujo horário já venceu — usado pela importação em
 *    massa (CSV) para espalhar publicações ao longo do dia em vez de postar
 *    tudo de uma vez.
 * 2. Dispara os ScheduleSlot cujo horário bateu com o horário atual (uma vez por dia).
 * 3. Roda as AutopilotRule ativas em modo AUTOMATIC (spec §27/§28) — sem esperar horário fixo.
 * 4. Publica automaticamente as Publication já aprovadas e com horário vencido.
 */
export async function schedulerTick(): Promise<void> {
  const now = new Date();
  const hhmm = currentTimeHHmm();

  await maybeRunDailyDiscovery(now);
  await runDuePublishJobs(now);

  const dueSlots = await prisma.scheduleSlot.findMany({ where: { active: true, time: hhmm } });

  for (const slot of dueSlots) {
    if (slot.lastRunAt && isSameDay(slot.lastRunAt, now)) continue;

    try {
      await runScheduleSlot(slot.id);
    } catch (error) {
      logger.error("JOB", `Falha ao executar ScheduleSlot "${slot.name}"`, { slotId: slot.id, error });
    }
  }

  const activeAutomaticRules = await prisma.autopilotRule.findMany({
    where: { active: true, mode: AutopilotMode.AUTOMATIC },
  });

  for (const rule of activeAutomaticRules) {
    try {
      await runAutopilotRule(rule.id);
    } catch (error) {
      logger.error("AUTOPILOT", `Falha ao executar regra "${rule.name}"`, { ruleId: rule.id, error });
    }
  }

  const duePublications = await prisma.publication.findMany({
    where: {
      status: PublicationStatus.QUEUED,
      scheduledAt: { lte: now },
      content: { status: ContentStatus.APPROVED },
    },
    take: 20,
  });

  for (const publication of duePublications) {
    try {
      await executePublication(publication.id);
    } catch (error) {
      logger.error("JOB", "Falha ao publicar automaticamente no horário agendado", { publicationId: publication.id, error });
    }
  }
}
