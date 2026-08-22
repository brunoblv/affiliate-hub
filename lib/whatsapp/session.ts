import path from "node:path";
import type { WASocket } from "@whiskeysockets/baileys";
import { registrar } from "@/lib/log";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");

let socketPromise: Promise<WASocket> | null = null;

function connect(attempt = 0): Promise<WASocket> {
  return new Promise((resolve, reject) => {
    void (async () => {
      // Import dinâmico: página/rota que nunca publica no WhatsApp não deve
      // precisar que o Baileys esteja resolvível (biblioteca pesada/não-oficial).
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import("@whiskeysockets/baileys");
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const sock = makeWASocket({ auth: state, printQRInTerminal: false });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          void registrar("ERRO", "PUBLICACAO", "WhatsApp: sessão não autenticada — rode `npm run whatsapp:login` para conectar.");
        }

        if (connection === "open") {
          void registrar("INFO", "PUBLICACAO", "WhatsApp: conectado");
          resolve(sock);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;

          // O WhatsApp fecha a conexão pedindo restart em algumas situações
          // (ex: logo após um novo pareamento) — não é falha, só reconectar.
          if (statusCode === DisconnectReason.restartRequired && attempt < 3) {
            void registrar("INFO", "PUBLICACAO", "WhatsApp: restart necessário, reconectando", { attempt });
            socketPromise = connect(attempt + 1);
            socketPromise.then(resolve, reject);
            return;
          }

          void registrar("ERRO", "PUBLICACAO", "WhatsApp: conexão fechada", { statusCode, loggedOut });
          socketPromise = null;

          reject(
            loggedOut
              ? new Error("Sessão do WhatsApp desconectada (logout) — rode `npm run whatsapp:login` novamente.")
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
 * `npm run whatsapp:login` (escaneando o QR code uma vez); as credenciais
 * ficam salvas em WHATSAPP_AUTH_DIR e são reaproveitadas nas próximas
 * conexões, sem precisar escanear de novo.
 */
export function getWhatsAppSocket(): Promise<WASocket> {
  if (!socketPromise) socketPromise = connect();
  return socketPromise;
}
