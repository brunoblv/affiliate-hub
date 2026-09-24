import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { normalize } from "@/lib/search-text";

export type MetricInput =
  | { kind: "SEARCH"; term: string; resultCount: number; nicheId?: string }
  | { kind: "PRODUCT_VIEW"; productId: string; nicheId?: string };
export type MetricPayload = MetricInput & { id: string; issuedAt: number };
export const TOKEN_LIFETIME_MS = 30 * 60_000;

/** Evita persistir e-mails, URLs e sequências que possam representar telefone/documento. */
export function metricTerm(value: string): string {
  const clean = normalize(value);
  if (/@|https?:\/\/|www\.|(?:\d[\s().+/-]*){7,}/i.test(clean)) return "[termo omitido]";
  return clean.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 120).trim();
}
function signature(body: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`hub-metric-v1:${body}`).digest();
}
export function createMetricToken(input: MetricInput, secret = process.env.AUTH_SECRET, now = Date.now()): string | null {
  if (!secret) return null;
  const data = { ...input, ...(input.kind === "SEARCH" ? { term: metricTerm(input.term) } : {}), id: randomUUID(), issuedAt: now };
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${signature(body, secret).toString("base64url")}`;
}
export function verifyMetricToken(token: unknown, secret = process.env.AUTH_SECRET, now = Date.now()): MetricPayload | null {
  if (!secret || typeof token !== "string" || token.length > 2000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, rawSignature] = parts;
  const received = Buffer.from(rawSignature, "base64url");
  const expected = signature(body, secret);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const id = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 100;
    if (!id(data.id) || !Number.isSafeInteger(data.issuedAt) || data.issuedAt > now || now - data.issuedAt >= TOKEN_LIFETIME_MS || (data.nicheId !== undefined && !id(data.nicheId))) return null;
    if (data.kind === "SEARCH" && typeof data.term === "string" && data.term.length <= 120 && Number.isSafeInteger(data.resultCount) && data.resultCount >= 0 && data.resultCount <= 2147483647) {
      return { id: data.id, issuedAt: data.issuedAt, kind: "SEARCH", term: data.term, resultCount: data.resultCount, nicheId: data.nicheId };
    }
    if (data.kind === "PRODUCT_VIEW" && id(data.productId)) return { id: data.id, issuedAt: data.issuedAt, kind: "PRODUCT_VIEW", productId: data.productId, nicheId: data.nicheId };
  } catch { /* Token inválido. Não registrar conteúdo recebido em logs. */ }
  return null;
}
