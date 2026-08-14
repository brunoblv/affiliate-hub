import "dotenv/config";
import { prisma } from "@/lib/database";
import { Channel } from "@/lib/generated/prisma/client";

/**
 * Agenda "ideal" de espaçamento entre publicações automáticas (Facebook,
 * Telegram, WhatsApp): 5 horários por canal, cobrindo os picos de
 * engajamento do dia (manhã, almoço, tarde, início e fim de noite),
 * espaçados ~3h entre si e levemente escalonados entre canais pra não
 * coincidir no mesmo minuto. Idempotente — roda de novo sem duplicar.
 */
const SLOTS: Array<{ name: string; channel: Channel; time: string }> = [
  { name: "Manhã", channel: Channel.FACEBOOK, time: "09:00" },
  { name: "Almoço", channel: Channel.FACEBOOK, time: "12:30" },
  { name: "Tarde", channel: Channel.FACEBOOK, time: "16:00" },
  { name: "Início da noite", channel: Channel.FACEBOOK, time: "19:30" },
  { name: "Noite", channel: Channel.FACEBOOK, time: "21:30" },

  { name: "Manhã", channel: Channel.TELEGRAM, time: "08:30" },
  { name: "Almoço", channel: Channel.TELEGRAM, time: "12:00" },
  { name: "Tarde", channel: Channel.TELEGRAM, time: "15:30" },
  { name: "Início da noite", channel: Channel.TELEGRAM, time: "18:30" },
  { name: "Noite", channel: Channel.TELEGRAM, time: "21:00" },

  { name: "Manhã", channel: Channel.WHATSAPP, time: "09:15" },
  { name: "Almoço", channel: Channel.WHATSAPP, time: "13:00" },
  { name: "Tarde", channel: Channel.WHATSAPP, time: "16:30" },
  { name: "Início da noite", channel: Channel.WHATSAPP, time: "20:00" },
  { name: "Noite", channel: Channel.WHATSAPP, time: "22:00" },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const slot of SLOTS) {
    const existing = await prisma.scheduleSlot.findFirst({
      where: { channel: slot.channel, time: slot.time },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.scheduleSlot.create({
      data: { name: slot.name, channel: slot.channel, time: slot.time, postsPerSlot: 1 },
    });
    created += 1;
  }

  console.log(`Horários criados: ${created} · já existentes (pulados): ${skipped}`);
}

main().finally(() => prisma.$disconnect());
