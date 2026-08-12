import { Channel } from "@/lib/generated/prisma/client";
import type { Publisher } from "./publisher";
import { FacebookPublisher, InstagramPublisher } from "./meta-publisher";
import { TikTokPublisher } from "./tiktok-publisher";
import { TelegramPublisher } from "./telegram-publisher";
import { WhatsAppPublisher } from "./whatsapp-publisher";

/**
 * Resolve o publicador correto para um canal, sem que o restante da
 * aplicação precise conhecer detalhes específicos de cada API (spec §19).
 */
export function getPublisher(channel: Channel, options?: { pageId?: string; igUserId?: string; chatId?: string }): Publisher {
  switch (channel) {
    case Channel.FACEBOOK:
      return new FacebookPublisher(options?.pageId ?? "");
    case Channel.INSTAGRAM:
      return new InstagramPublisher(options?.igUserId ?? "");
    case Channel.TIKTOK:
      return new TikTokPublisher();
    case Channel.TELEGRAM:
      return new TelegramPublisher(options?.chatId ?? "");
    case Channel.WHATSAPP:
      return new WhatsAppPublisher(options?.chatId ?? "");
    default:
      throw new Error(`Nenhum publisher implementado para o canal ${channel}`);
  }
}
