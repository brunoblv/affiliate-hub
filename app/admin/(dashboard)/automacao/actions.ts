"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { runProductDiscovery } from "@/lib/discovery";
import { logger } from "@/lib/logging";

/** Botão "Rodar descoberta agora" — dispara o mesmo motor que o scheduler chama diariamente às 06:00. */
export async function runDiscoveryNowAction() {
  try {
    await runProductDiscovery();
  } catch (error) {
    logger.error("JOB", "Descoberta manual falhou", { error: error instanceof Error ? error.message : String(error) });
  }
  revalidatePath("/admin/automacao");
}

export async function updateDiscoveryScheduleAction(formData: FormData) {
  const time = String(formData.get("time") ?? "06:00").trim();

  const setting = await prisma.setting.findUnique({ where: { key: "discoverySchedule" } });
  const current = (setting?.value as Record<string, unknown>) ?? {};

  await prisma.setting.upsert({
    where: { key: "discoverySchedule" },
    create: { key: "discoverySchedule", value: { ...current, time } },
    update: { value: { ...current, time } },
  });

  revalidatePath("/admin/automacao");
}

export async function updateDiscoveryRulesAction(formData: FormData) {
  const minPrice = Number(formData.get("minPrice") ?? 20) || 0;
  const maxPrice = Number(formData.get("maxPrice") ?? 2000) || 0;

  await prisma.setting.upsert({
    where: { key: "discoveryRules" },
    create: { key: "discoveryRules", value: { minPrice, maxPrice } },
    update: { value: { minPrice, maxPrice } },
  });

  revalidatePath("/admin/automacao");
}

/** Intervalo/janela usados para espalhar as publicações agendadas pela importação em massa (nunca tudo de uma vez). */
export async function updatePublishScheduleAction(formData: FormData) {
  const intervalMinutes = Number(formData.get("intervalMinutes") ?? 90) || 90;
  const windowStartHour = Number(formData.get("windowStartHour") ?? 9) || 0;
  const windowEndHour = Number(formData.get("windowEndHour") ?? 21) || 23;

  await prisma.setting.upsert({
    where: { key: "publishSchedule" },
    create: { key: "publishSchedule", value: { intervalMinutes, windowStartHour, windowEndHour } },
    update: { value: { intervalMinutes, windowStartHour, windowEndHour } },
  });

  revalidatePath("/admin/automacao");
}
