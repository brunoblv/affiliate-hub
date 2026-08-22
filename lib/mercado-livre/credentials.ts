import { prisma } from "@/lib/database";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";

export interface MercadoLivreTokenSet {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireAt: number; // epoch ms
  userId: number;
  scope: string;
}

const PROVEDOR = "mercado_livre";

export async function saveMercadoLivreTokens(tokens: MercadoLivreTokenSet): Promise<void> {
  const payload = encryptJson(tokens);

  await prisma.credencial.upsert({
    where: { provedor: PROVEDOR },
    create: { provedor: PROVEDOR, payload },
    update: { payload, ativo: true },
  });
}

export async function getMercadoLivreTokens(): Promise<MercadoLivreTokenSet | null> {
  const registro = await prisma.credencial.findUnique({ where: { provedor: PROVEDOR } });
  if (!registro?.ativo) return null;

  return decryptJson<MercadoLivreTokenSet>(registro.payload);
}
