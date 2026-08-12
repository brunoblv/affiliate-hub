/**
 * Apaga posts de teste pelo ID Graph (pageId_postId).
 * Uso: npx tsx scripts/delete-facebook-posts.ts <postId> [postId...]
 */
import "dotenv/config";
import { listActiveMetaPages } from "../lib/meta/credentials";
import { GRAPH_API_BASE_URL } from "../lib/meta/graph-version";

async function deletePost(postId: string, accessToken: string) {
  const url = new URL(`${GRAPH_API_BASE_URL}/${postId}`);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { method: "DELETE" });
  const json = (await response.json()) as { success?: boolean; error?: { message: string } };

  if (!response.ok || json.success !== true) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }
}

async function main() {
  const postIds = process.argv.slice(2);
  if (postIds.length === 0) {
    throw new Error("Passe os IDs dos posts: npx tsx scripts/delete-facebook-posts.ts <id> ...");
  }

  const pages = await listActiveMetaPages();
  const byPageId = new Map(pages.map((p) => [p.id, p]));

  for (const postId of postIds) {
    const pageId = postId.split("_")[0];
    const page = byPageId.get(pageId);
    if (!page) {
      console.log(`FAIL ${postId} → página ${pageId} não encontrada nas credenciais`);
      continue;
    }
    try {
      await deletePost(postId, page.accessToken);
      console.log(`OK  apagado ${postId} (${page.name})`);
    } catch (err) {
      console.log(`FAIL ${postId} → ${err instanceof Error ? err.message : err}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
