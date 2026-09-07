import path from "node:path";

/** Diretório da sessão Baileys — o mesmo no worker e no diagnóstico do admin. */
export function diretorioAuthWhatsApp(): string {
  return process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");
}
