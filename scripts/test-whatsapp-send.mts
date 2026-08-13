import "dotenv/config";
import { getWhatsAppSocket } from "@/lib/whatsapp/session";

/**
 * Teste manual: manda uma mensagem simples pro grupo informado, usando a
 * sessão já autenticada (scripts/whatsapp-login.mts). Rodar na mesma máquina
 * onde a sessão foi criada (a VPS, não localmente).
 *
 * Uso:
 *   npx tsx scripts/test-whatsapp-send.mts "120363408993059057@g.us"
 */
async function main() {
  const groupJid = process.argv[2];
  if (!groupJid) throw new Error('Uso: npx tsx scripts/test-whatsapp-send.mts "<JID do grupo>"');

  const sock = await getWhatsAppSocket();
  const result = await sock.sendMessage(groupJid, { text: "✅ Teste de conexão do sistema — pode ignorar." });
  console.log("enviado:", result?.key?.id);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
