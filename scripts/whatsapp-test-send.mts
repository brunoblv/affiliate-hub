import "dotenv/config";
import path from "node:path";
import makeWASocket, { useMultiFileAuthState as carregarEstadoDeAutenticacao, DisconnectReason } from "@whiskeysockets/baileys";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");

/**
 * Teste manual de envio via WhatsApp, reaproveitando a sessão salva por
 * `npm run whatsapp:login` (não abre QR code).
 *
 * Uso:
 *   npm run whatsapp:test-send -- <jid-do-grupo-ou-numero> "texto da mensagem"
 *
 * Exemplos de destino:
 *   120363408993059057@g.us   (grupo, JID obtido no whatsapp:login)
 *   5511999999999@s.whatsapp.net  (número direto, com DDI+DDD)
 */
async function main() {
  const [destino, texto] = process.argv.slice(2);

  if (!destino || !texto) {
    console.error('Uso: npm run whatsapp:test-send -- <jid> "texto"');
    process.exit(1);
  }

  const { state, saveCreds } = await carregarEstadoDeAutenticacao(AUTH_DIR);
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(`Conectado! Enviando mensagem de teste para ${destino}...`);

      try {
        const resultado = await sock.sendMessage(destino, { text: texto });
        console.log("Enviado com sucesso. message id:", resultado?.key?.id);
      } catch (erro) {
        console.error("Falha ao enviar:", erro);
      } finally {
        process.exit(0);
      }
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("Sessão desconectada pelo WhatsApp — rode `npm run whatsapp:login` novamente.");
      } else {
        console.log("Conexão encerrada.", lastDisconnect?.error?.message ?? "");
      }
      process.exit(1);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
