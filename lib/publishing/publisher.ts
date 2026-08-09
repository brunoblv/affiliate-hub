import { Channel } from "@/lib/generated/prisma/client";

export interface PublishableContent {
  id: string;
  title?: string | null;
  description?: string | null;
  caption?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

export interface PublishResult {
  externalPostId: string;
}

/** Contrato comum a todo publicador de canal. */
export interface Publisher {
  readonly channel: Channel;
  publish(content: PublishableContent): Promise<PublishResult>;
}
