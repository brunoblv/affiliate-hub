import { ECDH } from "node:crypto";

export function validEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com"
      || host.endsWith(".push.services.mozilla.com") || host === "web.push.apple.com"
      || host.endsWith(".notify.windows.com");
    return allowed && url.protocol === "https:" && !url.username && !url.password
      && !url.port && !url.hash && url.pathname.length > 1;
  } catch { return false; }
}

export function parseSubscription(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const { endpoint, keys } = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (!validEndpoint(endpoint) || !keys) return null;
  const { p256dh, auth } = keys;
  if (typeof p256dh !== "string" || typeof auth !== "string"
    || !/^[\w-]{87}$/.test(p256dh) || !/^[\w-]{22}$/.test(auth)) return null;
  try {
    const publicKey = Buffer.from(p256dh, "base64url");
    if (publicKey[0] !== 4 || ECDH.convertKey(publicKey, "prime256v1").length !== 65) return null;
    if (Buffer.from(auth, "base64url").length !== 16) return null;
    return { endpoint, p256dh, auth };
  } catch { return null; }
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export function pushFailure(error: unknown) {
  const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0;
  return {
    expired: status === 404 || status === 410,
    retry: status === 429 || status >= 500 && status <= 599,
    status: status >= 400 && status <= 599 ? "FAILED" as const : "UNCERTAIN" as const,
    code: status >= 400 && status <= 599 ? `HTTP_${status}` : "UNKNOWN_RESULT",
  };
}
