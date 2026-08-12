/**
 * Grava Page Access Tokens a partir de META_USER_TOKEN no .env.
 * Em runtime a publicação já faz isso sozinha (ensureMetaPagesFromEnv);
 * este script serve para popular o banco à mão / conferir.
 *
 * Uso:
 *   npm run meta:bootstrap
 */
import "dotenv/config";
import { ensureMetaPagesFromEnv } from "../lib/meta/ensure-from-env";
import { metaUserTokenConfigured } from "../lib/meta/user-token-env";

async function main() {
  if (!metaUserTokenConfigured()) {
    throw new Error("META_USER_TOKEN não está definido no .env");
  }

  const saved = await ensureMetaPagesFromEnv({ force: true });
  console.log(`Meta pronto: ${saved?.pages.length ?? 0} página(s)`);
  for (const page of saved?.pages ?? []) {
    console.log(
      `  - ${page.name} (${page.id})${page.instagramBusinessAccountId ? ` IG=${page.instagramBusinessAccountId}` : ""}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
