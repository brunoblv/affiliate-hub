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

async function syncMetaFacebookPages(pages: MetaPage[]): Promise<void> {
  const seen = new Set<string>();

  for (const page of pages) {
    seen.add(page.id);
    const encryptedAccessToken = encryptJson(page.accessToken);

    await prisma.metaFacebookPage.upsert({
      where: { pageId: page.id },
      create: {
        pageId: page.id,
        name: page.name,
        accessToken: encryptedAccessToken,
        active: true,
        instagramBusinessAccountId: page.instagramBusinessAccountId ?? null,
      },
      update: {
        name: page.name,
        accessToken: encryptedAccessToken,
        active: true,
        instagramBusinessAccountId: page.instagramBusinessAccountId ?? null,
      },
    });
  }

  // Páginas que sumiram do token atual ficam inativas (não apagamos histórico).
  await prisma.metaFacebookPage.updateMany({
    where: { pageId: { notIn: [...seen] }, active: true },
    data: { active: false },
  });
}

/** Lista páginas ativas da tabela meta_facebook_pages (tokens descriptografados). */
export async function listActiveMetaPages(): Promise<MetaPage[]> {
  const rows = await prisma.metaFacebookPage.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.pageId,
    name: row.name,
    accessToken: decryptJson<string>(row.accessToken),
    instagramBusinessAccountId: row.instagramBusinessAccountId ?? undefined,
  }));
}

export async function getMetaPageByPageId(pageId: string): Promise<MetaPage | null> {
  const row = await prisma.metaFacebookPage.findFirst({
    where: { pageId, active: true },
  });
  if (!row) return null;

  return {
    id: row.pageId,
    name: row.name,
    accessToken: decryptJson<string>(row.accessToken),
    instagramBusinessAccountId: row.instagramBusinessAccountId ?? undefined,
  };
}

export async function saveMetaTokens(tokens: MetaTokenSet): Promise<void> {
  const encryptedPayload = encryptJson(tokens);

  await prisma.integrationCredential.upsert({
    where: { provider_label: { provider: IntegrationProvider.META, label: LABEL } },
    create: { provider: IntegrationProvider.META, label: LABEL, encryptedPayload },
    update: { encryptedPayload, active: true },
  });

  await syncMetaFacebookPages(tokens.pages);
}

export async function getMetaTokens(): Promise<MetaTokenSet | null> {
  const record = await prisma.integrationCredential.findUnique({
    where: { provider_label: { provider: IntegrationProvider.META, label: LABEL } },
  });

  if (!record?.active) return null;

  const tokens = decryptJson<MetaTokenSet>(record.encryptedPayload);
  const pages = await listActiveMetaPages();

  // Preferir a tabela de páginas quando houver registros; senão, fallback do blob legado.
  return {
    ...tokens,
    pages: pages.length > 0 ? pages : tokens.pages,
  };
}
