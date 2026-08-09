import { Channel } from "@/lib/generated/prisma/client";
import { tiktokClient } from "@/lib/tiktok";
import type { Publisher, PublishableContent, PublishResult } from "./publisher";

export class TikTokPublisher implements Publisher {
  readonly channel = Channel.TIKTOK;

  async publish(content: PublishableContent): Promise<PublishResult> {
    await tiktokClient.publish(content);
    return { externalPostId: "stub-tiktok-post-id" };
  }
}
