import { IntegrationProvider } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/database";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";

export interface MetaPage {
  id: string;
  name: string;
  accessToken: string;
  instagramBusinessAccountId?: string;
}

export interface MetaTokenSet {
  userAccessToken: string; // long-lived user token
  userAccessTokenExpireAt: number; // epoch ms
  pages: MetaPage[];
}

const LABEL = "default";

export async function saveMetaTokens(tokens: MetaTokenSet): Promise<void> {
  const encryptedPayload = encryptJson(tokens);

  await prisma.integrationCredential.upsert({
    where: { provider_label: { provider: IntegrationProvider.META, label: LABEL } },
    create: { provider: IntegrationProvider.META, label: LABEL, encryptedPayload },
    update: { encryptedPayload, active: true },
  });
}

export async function getMetaTokens(): Promise<MetaTokenSet | null> {
  const record = await prisma.integrationCredential.findUnique({
    where: { provider_label: { provider: IntegrationProvider.META, label: LABEL } },
  });

  if (!record?.active) return null;

  return decryptJson<MetaTokenSet>(record.encryptedPayload);
}
