import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Criptografia simétrica (AES-256-GCM) para tokens de integração persistidos
 * em IntegrationCredential.encryptedPayload (spec §36: "Tokens de usuários
 * deverão ser tratados de maneira segura, com criptografia quando apropriado").
 *
 * A chave é derivada de CREDENTIALS_ENCRYPTION_KEY via scrypt, então qualquer
 * string secreta suficientemente longa serve como valor da env var.
 */
function getKey(): Buffer {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY não configurada.");
  }
  return scryptSync(secret, "affiliate-manager-credentials", 32);
}

export function encryptJson(value: unknown): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptJson<T>(payload: string): T {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");

  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
