import "dotenv/config";
import { prisma } from "@/lib/db";
import { getThreadsToken } from "@/lib/social/threads-token";

const GRAPH = "https://graph.facebook.com/v23.0";
const THREADS = "https://graph.threads.net/v1.0";

type Json = Record<string, unknown> & { error?: { message?: string; code?: number } };

async function get(url: string, token: string): Promise<Json> {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}access_token=${encodeURIComponent(token)}`);
  return (await res.json()) as Json;
}

function fail(label: string, data: Json) {
  console.error(`${label}: erro ${data.error?.code ?? "?"} — ${data.error?.message ?? "resposta inesperada"}`);
  process.exitCode = 1;
}

async function checkMeta(token: string) {
  const debug = await get(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}`, token);
  const info = debug.data as { type?: string; is_valid?: boolean; expires_at?: number; scopes?: string[] } | undefined;
  if (!info) return fail("Meta (debug_token)", debug);
  const exp = info.expires_at ? new Date(info.expires_at * 1000).toISOString() : "não expira";
  console.log(`Meta: tipo=${info.type} válido=${info.is_valid} expira=${exp}`);
  console.log(`  escopos: ${(info.scopes ?? []).join(", ") || "(nenhum)"}`);

  const me = await get(`${GRAPH}/me?fields=id,name`, token);
  if (me.error) return fail("Meta (/me)", me);
  console.log(`  identidade: ${me.name} (${me.id})`);

  // Token de usuário/system user lista as páginas; token de página retorna erro aqui e é tratado abaixo.
  const accounts = await get(
    `${GRAPH}/me/accounts?fields=id,name,tasks,instagram_business_account{id,username}`,
    token,
  );
  const pages = (accounts.data as Array<Record<string, any>> | undefined) ?? [];
  if (accounts.error) {
    const ig = await get(`${GRAPH}/me?fields=instagram_business_account{id,username}`, token);
    console.log("  (token parece ser de página)");
    const acc = ig.instagram_business_account as { id: string; username: string } | undefined;
    console.log(`  Instagram: ${acc ? `@${acc.username} (${acc.id})` : "nenhuma conta IG vinculada à página"}`);
    return;
  }
  if (!pages.length) console.log("  Páginas: nenhuma página acessível com este token");
  for (const p of pages) {
    const ig = p.instagram_business_account as { id: string; username: string } | undefined;
    console.log(`  Página: ${p.name} (${p.id}) tarefas=${(p.tasks ?? []).join("/")}`);
    console.log(`    Instagram: ${ig ? `@${ig.username} (${ig.id})` : "nenhuma conta IG vinculada"}`);
  }
}

async function checkThreads({ token, expiresAt }: { token: string; expiresAt: Date | null }) {
  const origem = expiresAt ? `renovado, expira ${expiresAt.toISOString()}` : "do .env, validade desconhecida até a 1ª renovação";
  const me = await get(`${THREADS}/me?fields=id,username,name`, token);
  if (me.error) return fail("Threads (/me)", me);
  console.log(`Threads: @${me.username} (${me.id}) — token ${origem}`);
  const limit = await get(`${THREADS}/${me.id}/threads_publishing_limit?fields=quota_usage,config`, token);
  if (limit.error) return fail("Threads (limite de publicação)", limit);
  const row = (limit.data as Array<{ quota_usage: number; config: { quota_total: number } }>)[0];
  console.log(`  publicação: ${row?.quota_usage ?? 0}/${row?.config?.quota_total ?? "?"} posts nas últimas 24h`);
}

async function main() {
  const meta = process.env.META_BOT_TOKEN;
  const threads = await getThreadsToken();
  if (meta) await checkMeta(meta); else console.log("Meta: META_BOT_TOKEN ausente");
  if (threads) await checkThreads(threads); else console.log("Threads: THREADS_USER_TOKEN ausente");
}
void main().finally(() => prisma.$disconnect());
