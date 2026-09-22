import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Busca de URL externa com proteção contra SSRF (seção 12 do documento): o servidor
 * só baixa de endereços públicos. Bloqueia loopback, redes privadas, link-local (inclui
 * o endereço de metadados de nuvem), portas fora de 80/443, esquemas que não sejam
 * http(s), e revalida cada redirecionamento. Também limita tempo e tamanho.
 */

export class UnsafeUrlError extends Error {}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local e metadados de nuvem
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      a >= 224 // multicast e reservados
    );
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff");
  }
  return true; // não é IP válido: não confiar
}

export interface SafeFetchDeps {
  resolve: (hostname: string) => Promise<string[]>;
  fetchImpl: typeof fetch;
}

const defaultDeps: SafeFetchDeps = {
  resolve: async (hostname) => (await lookup(hostname, { all: true })).map((entry) => entry.address),
  fetchImpl: fetch,
};

export async function assertPublicUrl(raw: string, deps: Pick<SafeFetchDeps, "resolve"> = defaultDeps): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("URL inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("Só http e https são permitidos.");
  if (url.username || url.password) throw new UnsafeUrlError("URL com credenciais não é permitida.");
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (port !== "80" && port !== "443") throw new UnsafeUrlError("Porta não permitida.");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host) ? [host] : await deps.resolve(host).catch(() => []);
  if (addresses.length === 0) throw new UnsafeUrlError("Não foi possível resolver o endereço.");
  if (addresses.some(isPrivateAddress)) throw new UnsafeUrlError("Endereço interno não é permitido.");
  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  /** Corta o download acima disso (erro, não truncamento silencioso). */
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  /** Para de ler depois de N bytes e devolve o que veio (checagem de cabeçalho), sem erro. */
  stopAfterBytes?: number;
}

export interface SafeResponse {
  status: number;
  contentType: string | null;
  body: Buffer;
  finalUrl: string;
}

export async function safeFetch(
  raw: string,
  options: SafeFetchOptions = {},
  overrides: Partial<SafeFetchDeps> = {},
): Promise<SafeResponse> {
  const deps = { ...defaultDeps, ...overrides };
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  const deadline = AbortSignal.timeout(options.timeoutMs ?? 10_000);
  let current = raw;

  for (let hop = 0; hop <= (options.maxRedirects ?? 3); hop++) {
    const url = await assertPublicUrl(current, deps);
    const response = await deps.fetchImpl(url, { redirect: "manual", signal: deadline, headers: options.headers });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = new URL(response.headers.get("location")!, url).toString();
      await response.body?.cancel();
      continue;
    }

    const declared = Number(response.headers.get("content-length"));
    if (!options.stopAfterBytes && declared > maxBytes) {
      await response.body?.cancel();
      throw new UnsafeUrlError("Arquivo grande demais.");
    }

    const chunks: Buffer[] = [];
    let total = 0;
    const reader = response.body?.getReader();
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (options.stopAfterBytes && total >= options.stopAfterBytes) {
        chunks.push(Buffer.from(value));
        await reader.cancel();
        break;
      }
      if (total > maxBytes) {
        await reader.cancel();
        throw new UnsafeUrlError("Arquivo grande demais.");
      }
      chunks.push(Buffer.from(value));
    }
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      body: Buffer.concat(chunks),
      finalUrl: url.toString(),
    };
  }
  throw new UnsafeUrlError("Redirecionamentos demais.");
}
