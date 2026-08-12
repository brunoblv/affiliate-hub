/**
 * Publica um post de texto de teste em cada página ativa de meta_facebook_pages.
 * Uso: npx tsx scripts/test-post-facebook-pages.ts
 */
import "dotenv/config";
import { listActiveMetaPages } from "../lib/meta/credentials";
import { GRAPH_API_BASE_URL } from "../lib/meta/graph-version";

async function postToPage(pageId: string, accessToken: string, message: string) {
  const url = new URL(`${GRAPH_API_BASE_URL}/${pageId}/feed`);
  const body = new URLSearchParams({
    message,
    access_token: accessToken,
  });

  const response = await fetch(url, { method: "POST", body });
  const json = (await response.json()) as { id?: string; error?: { message: string; code?: number } };

  if (!response.ok || !json.id) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }
  return json.id;
}

async function main() {
  const pages = await listActiveMetaPages();
  if (pages.length === 0) {
    throw new Error("Nenhuma página ativa em meta_facebook_pages.");
  }

  const stamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`Testando ${pages.length} página(s)…\n`);

  for (const page of pages) {
    const message = `🧪 Teste automático do sistema de afiliados\nPágina: ${page.name}\n${stamp}`;
    try {
      const postId = await postToPage(page.id, page.accessToken, message);
      console.log(`OK  ${page.name} (${page.id}) → post ${postId}`);
    } catch (err) {
      console.log(`FAIL ${page.name} (${page.id}) → ${err instanceof Error ? err.message : err}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
