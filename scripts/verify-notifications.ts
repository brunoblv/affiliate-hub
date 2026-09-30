import "dotenv/config";
import { getMailTransport } from "../lib/mail";
import { pushConfig } from "../lib/push/config";

async function main() {
  console.log("Push:", pushConfig() ? "chaves VAPID válidas" : "configuração VAPID ausente ou inválida");
  const transport = getMailTransport();
  if (!transport) { console.log("SMTP: configuração incompleta; nenhum envio realizado."); return; }
  try {
    await transport.verify();
    console.log("SMTP: conexão e autenticação verificadas. Nenhum e-mail enviado; entrega na caixa de entrada ainda precisa ser homologada.");
  } catch {
    console.error("SMTP: falha de conexão/autenticação. Confira as variáveis SMTP; detalhes omitidos para proteger credenciais.");
    process.exitCode = 1;
  } finally { transport.close(); }
}
void main();
