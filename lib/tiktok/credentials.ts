import { IntegrationProvider } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/database";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";

export interface TikTokTokenSet {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireAt: number; // epoch ms
  refreshTokenExpireAt: number; // epoch ms
  shopCipher?: string;
  sellerName?: string;
}

const LABEL = "default";

export async function saveTikTokTokens(tokens: TikTokTokenSet): Promise<void> {
  const encryptedPayload = encryptJson(tokens);

  await prisma.integrationCredential.upsert({
    where: { provider_label: { provider: IntegrationProvider.TIKTOK_SHOP, label: LABEL } },
    create: { provider: IntegrationProvider.TIKTOK_SHOP, label: LABEL, encryptedPayload },
    update: { encryptedPayload, active: true },
  });
}

export async function getTikTokTokens(): Promise<TikTokTokenSet | null> {
  const record = await prisma.integrationCredential.findUnique({
    where: { provider_label: { provider: IntegrationProvider.TIKTOK_SHOP, label: LABEL } },
  });

  if (!record?.active) return null;

  return decryptJson<TikTokTokenSet>(record.encryptedPayload);
}
