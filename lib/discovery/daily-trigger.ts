import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { runProductDiscovery } from "./run-discovery";

interface DiscoverySchedule {
  time: string; // HH:mm, horário local do servidor
  lastRunDate?: string; // toDateString() da última execução
}

const SETTING_KEY = "discoverySchedule";
const DEFAULT_TIME = "06:00";

function currentTimeHHmm(now: Date): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * Cron real da descoberta diária (docs/especificacao-automacao-produtos-chartfm.md
 * §22 "06:00 → Product Discovery"): chamado a cada tick do scheduler (60s, ver
 * workers/index.ts) e só executa de fato uma vez por dia, no horário
 * configurado em Setting("discoverySchedule") — sem depender de um processo
 * de cron do sistema operacional.
 */
export async function maybeRunDailyDiscovery(now = new Date()): Promise<void> {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  const schedule = (setting?.value as DiscoverySchedule | undefined) ?? { time: DEFAULT_TIME };

  if (currentTimeHHmm(now) !== schedule.time) return;
  if (schedule.lastRunDate === now.toDateString()) return;

  try {
    await runProductDiscovery();
  } catch (error) {
    logger.error("JOB", "Descoberta diária falhou", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: { ...schedule, lastRunDate: now.toDateString() } },
      update: { value: { ...schedule, lastRunDate: now.toDateString() } },
    });
  }
}
