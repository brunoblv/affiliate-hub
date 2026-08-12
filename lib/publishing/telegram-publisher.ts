import { Channel } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logging";
import type { Publisher, PublishableContent, PublishResult } from "./publisher";

const API_BASE = "https://api.telegram.org";

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");
  return token;
}

/**
 * Publica em um canal/grupo do Telegram via Bot API (sendMessage/sendPhoto).
 * O bot precisa já estar adicionado como admin do chat alvo — isso é um
 * passo manual feito uma vez no app do Telegram, não algo que a API resolve.
 */
export class TelegramPublisher implements Publisher {
  readonly channel = Channel.TELEGRAM;

  constructor(private readonly chatId: string) {}

  async publish(content: PublishableContent): Promise<PublishResult> {
    if (!this.chatId) throw new Error("Canal do Telegram sem chat_id configurado (externalChatId).");

    const caption = content.caption ?? [content.title, content.description].filter(Boolean).join("\n\n");

    const result = content.imageUrl
      ? await this.sendPhoto(content.imageUrl, caption)
      : await this.sendMessage(caption);

    logger.info("PUBLISH", "Telegram: mensagem publicada", { chatId: this.chatId, messageId: result.message_id });

    return { externalPostId: String(result.message_id) };
  }

  private async sendMessage(text: string): Promise<{ message_id: number }> {
    return this.call<{ message_id: number }>("sendMessage", { chat_id: this.chatId, text, parse_mode: "HTML" });
  }

  private async sendPhoto(photoUrl: string, caption: string): Promise<{ message_id: number }> {
    // Telegram limita caption de foto a 1024 caracteres — texto maior vira mensagem de texto separada.
    if (caption.length > 1024) {
      await this.call("sendPhoto", { chat_id: this.chatId, photo: photoUrl });
      return this.sendMessage(caption);
    }
    return this.call<{ message_id: number }>("sendPhoto", { chat_id: this.chatId, photo: photoUrl, caption, parse_mode: "HTML" });
  }

  private async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${API_BASE}/bot${botToken()}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await response.json()) as TelegramApiResponse<T>;

    if (!response.ok || !json.ok || !json.result) {
      logger.error("PUBLISH", `Telegram: ${method} falhou`, { status: response.status, description: json.description });
      throw new Error(`Telegram API error em ${method}: ${json.description ?? response.statusText}`);
    }

    return json.result;
  }
}
