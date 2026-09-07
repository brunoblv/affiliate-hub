import path from "node:path";
import type { WASocket } from "@whiskeysockets/baileys";
import { registrar } from "@/lib/log";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");
const PAUSA_RECONEXAO_MS = 2_000;

let socketPromise: Promise<WASocket> | null = null;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function connect(attempt = 0): Promise<WASocket> {
  return new Promise((resolve, reject) => {
    void (async () => {
      // Import dinâmico: página/rota que nunca publica no WhatsApp não deve
      // precisar que o Baileys esteja resolvível (biblioteca pesada/não-oficial).
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import("@whiskeysockets/baileys");
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const sock = makeWASocket({ auth: state, printQRInTerminal: false });
      let aberto = false;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          void registrar("ERRO", "PUBLICACAO", "WhatsApp: sessão não autenticada — rode `npm run whatsapp:login` para conectar.");
          socketPromise = null;
          reject(new Error("WhatsApp pediu QR — sessão na VPS expirou. Rode `npm run whatsapp:login`."));
          return;
        }

        if (connection === "open") {
          aberto = true;
          void registrar("INFO", "PUBLICACAO", "WhatsApp: conectado");
          resolve(sock);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          const recuperavel =
            statusCode === DisconnectReason.restartRequired ||
            statusCode === DisconnectReason.connectionReplaced ||
            statusCode === DisconnectReason.connectionClosed ||
            statusCode === DisconnectReason.connectionLost ||
            statusCode === DisconnectReason.timedOut;

          // Handshake: restart, 440 (sessão substituída) e quedas curtas — reconectar.
          if (!aberto && !loggedOut && recuperavel && attempt < 3) {
            void registrar("INFO", "PUBLICACAO", "WhatsApp: conexão caiu no handshake, reconectando", {
              attempt,
              statusCode,
            });
            void esperar(PAUSA_RECONEXAO_MS).then(() => {
              socketPromise = connect(attempt + 1);
              socketPromise.then(resolve, reject);
            });
            return;
          }

          socketPromise = null;

          // Já estava aberto: o Promise já resolveu. A próxima publicação reconecta.
          if (aberto) {
            const substituida = statusCode === DisconnectReason.connectionReplaced;
            void registrar(
              "ALERTA",
              "PUBLICACAO",
              substituida
                ? "WhatsApp: sessão substituída (outro WhatsApp Web/worker). Feche a outra sessão ou rode `npm run whatsapp:login`."
                : "WhatsApp: conexão fechada, a próxima publicação reconecta",
              { statusCode, loggedOut },
            );
            return;
          }

          void registrar("ERRO", "PUBLICACAO", "WhatsApp: conexão fechada", { statusCode, loggedOut });
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
  if (!socketPromise) socketPromise = conectarComTimeout();
  return socketPromise;
}

const TIMEOUT_CONEXAO_MS = 45_000;

function conectarComTimeout(): Promise<WASocket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socketPromise = null;
      reject(
        new Error(
          "WhatsApp não conectou em 45s. Na VPS rode `npm run whatsapp:login` (QR) e confira WHATSAPP_AUTH_DIR.",
        ),
      );
    }, TIMEOUT_CONEXAO_MS);

    connect()
      .then((sock) => {
        clearTimeout(timer);
        resolve(sock);
      })
      .catch((erro) => {
        clearTimeout(timer);
        socketPromise = null;
        reject(erro);
      });
  });
}
