export const communityTypes = {
  WHATSAPP_GROUP: "Grupo WhatsApp",
  WHATSAPP_CHANNEL: "Canal WhatsApp",
  TELEGRAM_GROUP: "Grupo Telegram",
  TELEGRAM_CHANNEL: "Canal Telegram",
} as const;

/** Apenas convites HTTPS das plataformas suportadas; nunca aceitar redirecionadores. */
export function communityInvite(raw: string, platform: string, kind: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
    const path = url.pathname;
    if (platform === "WHATSAPP") {
      if (kind === "GROUP" && url.hostname === "chat.whatsapp.com" && /^\/[A-Za-z0-9_-]+\/?$/.test(path)) return url.href;
      if (kind === "CHANNEL" && url.hostname === "whatsapp.com" && /^\/channel\/[A-Za-z0-9_-]+\/?$/.test(path)) return url.href;
    }
    if (platform === "TELEGRAM" && (kind === "GROUP" || kind === "CHANNEL") && url.hostname === "t.me") {
      if (/^\/(?:\+[A-Za-z0-9_-]+|joinchat\/[A-Za-z0-9_-]+|[A-Za-z][A-Za-z0-9_]{4,31})\/?$/.test(path)
        && !/^\/(?:share|proxy|socks|login|addstickers|addemoji|iv|boost)\/?$/i.test(path)) return url.href;
    }
    return null;
  } catch { return null; }
}
