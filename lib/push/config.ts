import { createECDH } from "node:crypto";

export function pushConfig(env: Record<string, string | undefined> = process.env) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  try {
    const url = new URL(subject);
    if (url.protocol !== "mailto:" && url.protocol !== "https:") return null;
    const pair = createECDH("prime256v1");
    pair.setPrivateKey(Buffer.from(privateKey, "base64url"));
    if (pair.getPublicKey().toString("base64url") !== publicKey) return null;
    return { subject, publicKey, privateKey };
  } catch { return null; }
}
