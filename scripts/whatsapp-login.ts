import "dotenv/config";
import path from "node:path";
import qrcodeTerminal from "qrcode-terminal";
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");

/**
 * Login único do WhatsApp via Baileys — biblioteca NÃO-OFICIAL que simula um
 * cliente WhatsApp Web real (não existe API pública do WhatsApp para postar
 * em grupos). Isso está fora dos Termos de Serviço do WhatsApp e pode
 * resultar no banimento do número usado — use um número dedicado para
 * automação, nunca o principal.
 *
 * Uso (na pasta Sistema-afiliados, com terminal disponível pra escanear o QR):
 *   npx tsx scripts/whatsapp-login.ts
 *
 * Depois de conectar, lista os grupos participantes com seus JIDs — copie o
 * JID do grupo desejado para o campo "Chat ID / JID do grupo" ao cadastrar o
 * canal em /admin/afiliados/[projeto]/canais. A sessão fica salva em
 * WHATSAPP_AUTH_DIR e é reaproveitada depois — não precisa escanear de novo.
 */
async function main() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
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
      console.log("Conexão encerrada.", lastDisconnect?.error?.message ?? "");
      process.exit(0);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
