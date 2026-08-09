"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { Channel, ContentType } from "@/lib/generated/prisma/client";
import { runScheduleSlot } from "@/lib/scheduler";
import { logger } from "@/lib/logging";

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Cria um horário recorrente de publicação (spec §25). */
export async function createScheduleSlotAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const time = String(formData.get("time") ?? "");
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("Horário inválido.");

  const channel = String(formData.get("channel") ?? "") as Channel;
  if (!Object.values(Channel).includes(channel)) throw new Error("Canal inválido.");

  const contentTypeRaw = String(formData.get("contentType") ?? "");
  const contentType = Object.values(ContentType).includes(contentTypeRaw as ContentType)
    ? (contentTypeRaw as ContentType)
    : undefined;

  await prisma.scheduleSlot.create({
    data: {
      name,
      channel,
      time,
      categoryId: String(formData.get("categoryId") ?? "") || undefined,
      campaignId: String(formData.get("campaignId") ?? "") || undefined,
      contentType,
      minScore: parseNumber(formData.get("minScore")),
      minDiscount: parseNumber(formData.get("minDiscount")),
      minPrice: parseNumber(formData.get("minPrice")),
      maxPrice: parseNumber(formData.get("maxPrice")),
      postsPerSlot: parseNumber(formData.get("postsPerSlot")) ?? 1,
    },
  });

  logger.info("JOB", "ScheduleSlot criado", { name, channel, time });
  revalidatePath("/admin/schedules");
}

/** Ativa/pausa um horário sem excluí-lo. */
export async function toggleScheduleSlotAction(slotId: string) {
  const slot = await prisma.scheduleSlot.findUniqueOrThrow({ where: { id: slotId } });
  await prisma.scheduleSlot.update({ where: { id: slotId }, data: { active: !slot.active } });
  revalidatePath("/admin/schedules");
}

export async function deleteScheduleSlotAction(slotId: string) {
  await prisma.scheduleSlot.delete({ where: { id: slotId } });
  revalidatePath("/admin/schedules");
}

/** Dispara o slot manualmente, sem esperar o horário configurado — útil para testar. */
export async function runScheduleSlotNowAction(slotId: string) {
  const result = await runScheduleSlot(slotId);
  logger.info("JOB", "ScheduleSlot disparado manualmente", { slotId, ...result });
  revalidatePath("/admin/schedules");
  revalidatePath("/admin/content");
}
