import { Channel } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logging";
import type { Publisher, PublishableContent, PublishResult } from "./publisher";

/** Placeholder para publicação em canais/grupos do Telegram (evolução futura, ver spec §45). */
export class TelegramPublisher implements Publisher {
  readonly channel = Channel.TELEGRAM;

  async publish(content: PublishableContent): Promise<PublishResult> {
    // TODO: integrar com Telegram Bot API (sendMessage / sendPhoto).
    logger.info("PUBLISH", "Telegram: publish (stub)", { contentId: content.id });
    return { externalPostId: "stub-telegram-post-id" };
  }
}
