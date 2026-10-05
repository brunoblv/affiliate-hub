import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Token de longa duração do Threads (60 dias). A Meta só renova um token que tenha
 * pelo menos 24h e ainda esteja válido; cada renovação devolve um token novo de 60 dias.
 * O renovado fica no banco (cifrado); o THREADS_USER_TOKEN do .env é só o ponto de partida.
 */
const ID = "threads";
const REFRESH_URL = "https://graph.threads.net/refresh_access_token";
export const REFRESH_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;

function key(secret: string): Buffer {
  return createHash("sha256").update(`hub-social-token-v1:${secret}`).digest();
}
export function sealToken(token: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}
export function openToken(sealed: string, secret: string): string | null {
  try {
    const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Sem registro salvo (só o token do .env, validade desconhecida) também conta como vencido. */
export function isRefreshDue(expiresAt: Date | null, now = Date.now()): boolean {
  return !expiresAt || expiresAt.getTime() - now <= REFRESH_BEFORE_MS;
}

async function stored(secret: string) {
  const row = await prisma.socialToken.findUnique({ where: { id: ID } });
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  const token = openToken(row.ciphertext, secret);
  return token ? { token, expiresAt: row.expiresAt } : null;
}

/** Token em uso: o renovado no banco, ou o do .env enquanto não houver renovação. */
export async function getThreadsToken(): Promise<{ token: string; expiresAt: Date | null } | null> {
  const secret = process.env.AUTH_SECRET;
  const saved = secret ? await stored(secret) : null;
  if (saved) return saved;
  const env = process.env.THREADS_USER_TOKEN;
  return env ? { token: env, expiresAt: null } : null;
}

export type RefreshOutcome = "disabled" | "not-due" | "refreshed" | { error: string };

export async function refreshThreadsTokenIfDue(now = Date.now()): Promise<RefreshOutcome> {
  const secret = process.env.AUTH_SECRET;
  const current = await getThreadsToken();
  if (!secret || !current) return "disabled";
  if (!isRefreshDue(current.expiresAt, now)) return "not-due";

  const url = `${REFRESH_URL}?grant_type=th_refresh_token&access_token=${encodeURIComponent(current.token)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const json = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string; code?: number };
  };
  if (!response.ok || !json.access_token || !json.expires_in) {
    // Mensagem da API não inclui o token; segura para log.
    return { error: `${json.error?.code ?? response.status}: ${json.error?.message ?? "resposta inesperada"}` };
  }
  const data = {
    ciphertext: sealToken(json.access_token, secret),
    expiresAt: new Date(now + json.expires_in * 1000),
    refreshedAt: new Date(now),
  };
  await prisma.socialToken.upsert({ where: { id: ID }, create: { id: ID, ...data }, update: data });
  return "refreshed";
}
