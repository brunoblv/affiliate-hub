import { Channel } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logging";
import { getWhatsAppSocket } from "@/lib/whatsapp/session";
import type { Publisher, PublishableContent, PublishResult } from "./publisher";

/**
 * Publica em um grupo do WhatsApp via Baileys — ver aviso sobre biblioteca
 * não-oficial em lib/whatsapp/session.ts. O JID do grupo (`externalChatId`
 * do ProjectChannel) é obtido rodando `npx tsx scripts/whatsapp-login.mts`.
 */
export class WhatsAppPublisher implements Publisher {
  readonly channel = Channel.WHATSAPP;

  constructor(private readonly groupJid: string) {}

  async publish(content: PublishableContent): Promise<PublishResult> {
    if (!this.groupJid) throw new Error("Canal do WhatsApp sem JID de grupo configurado (externalChatId).");

    const caption = content.caption ?? [content.title, content.description].filter(Boolean).join("\n\n");
    const sock = await getWhatsAppSocket();

    const result = content.imageUrl
      ? await sock.sendMessage(this.groupJid, { image: { url: content.imageUrl }, caption })
      : await sock.sendMessage(this.groupJid, { text: caption });

    const messageId = result?.key?.id;
    if (!messageId) throw new Error("WhatsApp: envio não retornou message id.");

    logger.info("PUBLISH", "WhatsApp: mensagem publicada", { groupJid: this.groupJid, messageId });

    return { externalPostId: messageId };
  }
}
