import "dotenv/config";
import path from "node:path";
import qrcodeTerminal from "qrcode-terminal";
import makeWASocket, { useMultiFileAuthState as carregarEstadoDeAutenticacao, DisconnectReason } from "@whiskeysockets/baileys";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");

/**
 * Login único do WhatsApp via Baileys — biblioteca NÃO-OFICIAL que simula um
 * cliente WhatsApp Web real (não existe API pública do WhatsApp para postar
 * em grupos). Isso está fora dos Termos de Serviço do WhatsApp e pode
 * resultar no banimento do número usado — use um número dedicado para
 * automação, nunca o principal.
 *
 * Uso (na pasta Sistema-afiliados, com terminal disponível pra escanear o QR):
 *   npm run whatsapp:login
 *
 * Depois de conectar, lista os grupos participantes com seus JIDs — copie o
 * JID do grupo desejado para o campo "Identificador externo" ao cadastrar o
 * canal em /admin/canais. A sessão fica salva em WHATSAPP_AUTH_DIR e é
 * reaproveitada depois — não precisa escanear de novo.
 */
async function main() {
  const { state, saveCreds } = await carregarEstadoDeAutenticacao(AUTH_DIR);
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("\nEscaneie este QR code no WhatsApp do celular (Aparelhos conectados > Conectar um aparelho):\n");
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("\nConectado! Buscando grupos participantes...\n");
      const groups = await sock.groupFetchAllParticipating();
      const list = Object.values(groups);

      if (list.length === 0) {
        console.log("Nenhum grupo encontrado para esta conta.");
      } else {
        for (const group of list) {
          console.log(`${group.subject}\n  JID: ${group.id}\n`);
        }
      }

      console.log(`Sessão salva em ${AUTH_DIR} — pode encerrar com Ctrl+C, não precisa escanear de novo.`);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;

      // Logo após aceitar o QR, o WhatsApp sempre fecha a conexão pedindo
      // restart (código 515) — é esperado, não é falha: reconectar reaproveita
      // as credenciais recém-salvas e completa o login sem pedir QR de novo.
      if (statusCode === DisconnectReason.restartRequired) {
        console.log("Restart necessário após parear — reconectando...");
        await main();
        return;
      }

      console.log("Conexão encerrada.", lastDisconnect?.error?.message ?? "");
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("Sessão desconectada pelo WhatsApp — apague a pasta de sessão e rode o login de novo.");
      }
      process.exit(0);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
