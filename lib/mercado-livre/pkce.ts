import { createHash, randomBytes } from "node:crypto";

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Gera um code_verifier aleatório para o fluxo PKCE exigido pelo OAuth do Mercado Livre. */
export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

/** Deriva o code_challenge (S256) a partir do code_verifier. */
export function generateCodeChallenge(codeVerifier: string): string {
  return base64UrlEncode(createHash("sha256").update(codeVerifier).digest());
}
