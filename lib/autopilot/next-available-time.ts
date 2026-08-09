import { prisma } from "@/lib/database";
import type { Channel } from "@/lib/generated/prisma/client";

function currentTimeHHmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * Resolve "agendar para o próximo horário disponível" (spec §28): busca o
 * próximo ScheduleSlot ativo do canal cujo horário ainda não passou hoje;
 * se nenhum horário restar hoje, usa o mais cedo de amanhã; se não houver
 * nenhum slot configurado para o canal, publica imediatamente.
 */
export async function nextAvailableTime(channel: Channel): Promise<Date> {
  const slots = await prisma.scheduleSlot.findMany({
    where: { active: true, channel },
    orderBy: { time: "asc" },
  });

  if (slots.length === 0) return new Date();

  const nowHHmm = currentTimeHHmm();
  const upcomingToday = slots.find((s) => s.time > nowHHmm);

  const target = new Date();
  if (upcomingToday) {
    const [h, m] = upcomingToday.time.split(":").map(Number);
    target.setHours(h, m, 0, 0);
    return target;
  }

  const [h, m] = slots[0].time.split(":").map(Number);
  target.setDate(target.getDate() + 1);
  target.setHours(h, m, 0, 0);
  return target;
}
