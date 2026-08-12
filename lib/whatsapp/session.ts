import path from "node:path";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, type WASocket } from "@whiskeysockets/baileys";
import { logger } from "@/lib/logging";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");

let socketPromise: Promise<WASocket> | null = null;

function connect(): Promise<WASocket> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const sock = makeWASocket({ auth: state, printQRInTerminal: false });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logger.warn("PUBLISH", "WhatsApp: sessão não autenticada — rode `npx tsx scripts/whatsapp-login.ts` para conectar.");
        }

        if (connection === "open") {
          logger.info("PUBLISH", "WhatsApp: conectado");
          resolve(sock);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          logger.warn("PUBLISH", "WhatsApp: conexão fechada", { statusCode, loggedOut });
          socketPromise = null;

          reject(
            loggedOut
              ? new Error("Sessão do WhatsApp desconectada (logout) — rode `npx tsx scripts/whatsapp-login.ts` novamente.")
              : new Error("Conexão do WhatsApp caiu — tente publicar novamente em instantes."),
          );
        }
      });
    })();
  });
}

/**
 * Obtém (ou reconecta) o socket autenticado do WhatsApp via Baileys —
 * biblioteca NÃO-OFICIAL que simula um cliente WhatsApp Web real (não há API
 * pública do WhatsApp para postar em grupos). Requer sessão já criada via
 * `npx tsx scripts/whatsapp-login.ts` (escaneando o QR code uma vez); as
 * credenciais ficam salvas em `WHATSAPP_AUTH_DIR` e são reaproveitadas nas
 * próximas conexões, sem precisar escanear de novo.
 */
export function getWhatsAppSocket(): Promise<WASocket> {
  if (!socketPromise) socketPromise = connect();
  return socketPromise;
}
