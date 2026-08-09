import { IntegrationProvider } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/database";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";

export interface MercadoLivreTokenSet {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireAt: number; // epoch ms
  userId: number;
  scope: string;
}

const LABEL = "default";

export async function saveMercadoLivreTokens(tokens: MercadoLivreTokenSet): Promise<void> {
  const encryptedPayload = encryptJson(tokens);

  await prisma.integrationCredential.upsert({
    where: { provider_label: { provider: IntegrationProvider.MERCADO_LIVRE, label: LABEL } },
    create: { provider: IntegrationProvider.MERCADO_LIVRE, label: LABEL, encryptedPayload },
    update: { encryptedPayload, active: true },
  });
}

export async function getMercadoLivreTokens(): Promise<MercadoLivreTokenSet | null> {
  const record = await prisma.integrationCredential.findUnique({
    where: { provider_label: { provider: IntegrationProvider.MERCADO_LIVRE, label: LABEL } },
  });

  if (!record?.active) return null;

  return decryptJson<MercadoLivreTokenSet>(record.encryptedPayload);
}
