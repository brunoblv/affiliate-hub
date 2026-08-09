import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica assinatura HMAC-SHA256 de um payload de webhook.
 * Todo webhook recebido deve ser validado antes de qualquer processamento (spec §40).
 */
export function verifyHmacSignature(payload: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
