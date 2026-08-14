import { Channel } from "@/lib/generated/prisma/client";
import { metaClient } from "@/lib/meta";
import type { Publisher, PublishableContent, PublishResult } from "./publisher";

/** Publica no Facebook usando o MetaClient (lib/meta). */
export class FacebookPublisher implements Publisher {
  readonly channel = Channel.FACEBOOK;

  constructor(private readonly pageId: string) {}

  async publish(content: PublishableContent): Promise<PublishResult> {
    // content.description é só o corpo do texto (sem CTA/link/disclosure —
    // ver lib/content/channel-formatters.ts); o link de afiliado só existe em
    // content.caption (texto completo formatado). Sem isso, o post ia sem link.
    const result = await metaClient.publishFacebookPost(this.pageId, {
      message: content.caption ?? [content.title, content.description].filter(Boolean).join("\n\n"),
      imageUrl: content.imageUrl ?? undefined,
    });
    return { externalPostId: result.id };
  }
}

/** Publica no Instagram usando o MetaClient (lib/meta). */
export class InstagramPublisher implements Publisher {
  readonly channel = Channel.INSTAGRAM;

  constructor(private readonly igUserId: string) {}

  async publish(content: PublishableContent): Promise<PublishResult> {
    const result = await metaClient.publishInstagramPost(this.igUserId, {
      message: content.caption ?? content.description ?? "",
      imageUrl: content.imageUrl ?? undefined,
    });
    return { externalPostId: result.id };
  }
}
