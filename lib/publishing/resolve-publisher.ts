import { Channel } from "@/lib/generated/prisma/client";
import { getMetaTokens } from "@/lib/meta/credentials";
import { getPublisher } from "./get-publisher";
import type { Publisher } from "./publisher";

/**
 * Resolve o Publisher de um canal escolhendo automaticamente a conta
 * conectada certa (Página do Facebook / conta Instagram vinculada) a partir
 * das credenciais salvas em IntegrationCredential — usado tanto na
 * publicação manual ("Publicar agora") quanto pelo worker da fila
 * `publication`.
 */
export async function resolvePublisher(channel: Channel): Promise<Publisher> {
  if (channel === Channel.FACEBOOK) {
    const tokens = await getMetaTokens();
    const page = tokens?.pages[0];
    if (!page) throw new Error("Nenhuma Página do Facebook conectada. Conecte a conta Meta em /admin/integrations.");
    return getPublisher(Channel.FACEBOOK, { pageId: page.id });
  }

  if (channel === Channel.INSTAGRAM) {
    const tokens = await getMetaTokens();
    const page = tokens?.pages.find((p) => p.instagramBusinessAccountId);
    if (!page?.instagramBusinessAccountId) {
      throw new Error("Nenhuma conta Instagram vinculada encontrada. Conecte a conta Meta em /admin/integrations.");
    }
    return getPublisher(Channel.INSTAGRAM, { igUserId: page.instagramBusinessAccountId });
  }

  return getPublisher(channel);
}
