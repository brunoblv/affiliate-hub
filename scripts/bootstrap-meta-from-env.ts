/**
 * Conecta Meta a partir de META_USER_TOKEN no .env (sem OAuth no browser).
 * Útil quando você já tem um user token válido do Graph API Explorer / app conhecido.
 *
 * Uso:
 *   npx tsx scripts/bootstrap-meta-from-env.ts
 */
import "dotenv/config";
import { fetchConnectedPages } from "../lib/meta/auth";
import { saveMetaTokens, getMetaTokens } from "../lib/meta/credentials";

async function main() {
  const raw = process.env.META_USER_TOKEN?.trim();
  if (!raw) {
    throw new Error("META_USER_TOKEN não está definido no .env");
  }

  // Se alguém colar dois tokens seguidos, usa o último segmento EAA… (user token típico).
  const segments = raw.split(/(?=EAA)/).map((s) => s.trim()).filter((s) => s.length > 20);
  const userAccessToken = segments.at(-1) ?? raw;

  if (segments.length > 1) {
    console.warn(`META_USER_TOKEN tinha ${segments.length} segmentos — usando o último.`);
  }

  const pages = await fetchConnectedPages(userAccessToken);
  if (pages.length === 0) {
    throw new Error(
      "Token ok, mas /me/accounts não retornou páginas. Confira permissões pages_show_list / pages_manage_posts.",
    );
  }

  await saveMetaTokens({
    userAccessToken,
    userAccessTokenExpireAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
    pages,
  });

  const saved = await getMetaTokens();
  console.log(`Meta conectado: ${saved?.pages.length ?? 0} página(s)`);
  for (const page of saved?.pages ?? []) {
    console.log(`  - ${page.name} (${page.id})${page.instagramBusinessAccountId ? ` IG=${page.instagramBusinessAccountId}` : ""}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
