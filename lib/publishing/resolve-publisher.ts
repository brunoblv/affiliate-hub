import { Channel } from "@/lib/generated/prisma/client";
import { ensureMetaPagesFromEnv } from "@/lib/meta/ensure-from-env";
import { getPublisher } from "./get-publisher";
import type { Publisher } from "./publisher";

/**
 * Resolve o Publisher de um canal escolhendo automaticamente a conta
 * certa (Página do Facebook / conta Instagram vinculada).
 * Com META_USER_TOKEN no .env, as páginas sobem sozinhas — sem OAuth.
 */
export async function resolvePublisher(channel: Channel): Promise<Publisher> {
  if (channel === Channel.FACEBOOK) {
    const tokens = await ensureMetaPagesFromEnv();
    const page = tokens?.pages[0];
    if (!page) {
      throw new Error(
        "Nenhuma Página do Facebook pronta. Defina META_USER_TOKEN no .env (admin da página).",
      );
    }
    return getPublisher(Channel.FACEBOOK, { pageId: page.id });
  }

  if (channel === Channel.INSTAGRAM) {
    const tokens = await ensureMetaPagesFromEnv();
    const page = tokens?.pages.find((p) => p.instagramBusinessAccountId);
    if (!page?.instagramBusinessAccountId) {
      throw new Error(
        "Nenhuma conta Instagram vinculada. Defina META_USER_TOKEN de um usuário com Página + IG Business.",
      );
    }
    return getPublisher(Channel.INSTAGRAM, { igUserId: page.instagramBusinessAccountId });
  }

  return getPublisher(channel);
}
