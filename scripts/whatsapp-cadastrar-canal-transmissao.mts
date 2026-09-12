import "dotenv/config";
import path from "node:path";
import makeWASocket, { useMultiFileAuthState as carregarEstadoDeAutenticacao, DisconnectReason } from "@whiskeysockets/baileys";
import { PrismaPg } from "@prisma/adapter-pg";
// Import relativo direto no client gerado — script .mts roda fora da
// resolução do alias "@/", igual aos outros scripts de WhatsApp (ver
// whatsapp-test-send.mts). Passar pelo barrel lib/database quebra em runtime.
import { PrismaClient } from "../lib/generated/prisma/client";
import { Rede, Destino } from "../lib/generated/prisma/enums";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), ".whatsapp-auth");
// Mesmo adapter/timezone de lib/database/client.ts — sem isso, agendadaPara
// grava com o fuso errado (ver comentário lá).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" }),
});

/**
 * Resolve um link de Canal de Transmissão do WhatsApp (ex.:
 * https://whatsapp.com/channel/0029VbDnwDGBVJlDPPkwf93k) pro JID real
 * (@newsletter) e cadastra/atualiza um Canal — depois disso o worker já
 * enfileira produto nele automaticamente (mesmo loop que já enche grupo,
 * ver lib/agenda/enfileirar.ts).
 *
 * A conta conectada (sessão de `npm run whatsapp:login`) precisa ser DONA ou
 * ADMIN do canal — não dá pra postar só seguindo. Se não for, o `sendMessage`
 * na hora de publicar vai falhar.
 *
 * Uso (no servidor, com DATABASE_URL de produção e sessão do WhatsApp já
 * logada em .whatsapp-auth):
 *   npx tsx scripts/whatsapp-cadastrar-canal-transmissao.mts <link-ou-codigo> <destino> [nome]
 *
 * Exemplo:
 *   npx tsx scripts/whatsapp-cadastrar-canal-transmissao.mts https://whatsapp.com/channel/0029VbDnwDGBVJlDPPkwf93k TIKTOK_SHOP
 */
function extrairCodigoConvite(entrada: string): string {
  const match = entrada.match(/channel\/([A-Za-z0-9]+)/);
  return match ? match[1]! : entrada.trim();
}

const NOME_PADRAO: Record<Destino, string> = {
  [Destino.TIKTOK_SHOP]: "Canal Achadinhos",
  [Destino.MEU_NOVO_LAR]: "Canal Meu Novo Lar",
  [Destino.UMBANDA]: "Canal Umbanda",
  [Destino.MAGO_MEIA_NOITE]: "Canal O Mago da Meia Noite",
};

function textoAninhado(valor: unknown): string {
  if (typeof valor === "string") return valor.trim();
  if (valor && typeof valor === "object" && "text" in valor) {
    const texto = (valor as { text?: unknown }).text;
    return typeof texto === "string" ? texto.trim() : "";
  }
  return "";
}

/** Baileys rc14 devolve o GraphQL cru: `name` vem vazio e o título está em thread_metadata.name.text. */
function nomeDoCanal(meta: { id: string; name?: unknown; thread_metadata?: { name?: unknown } }, destino: Destino, nomeArg?: string): string {
  const informado = nomeArg?.trim();
  if (informado) return informado;
  const doMeta = textoAninhado(meta.name) || textoAninhado(meta.thread_metadata?.name);
  return doMeta || NOME_PADRAO[destino] || "Canal WhatsApp";
}

async function main() {
  const [entrada, destinoRaw, nomeArg] = process.argv.slice(2);
  const destino = destinoRaw as Destino;

  if (!entrada || !destino) {
    console.error(
      "Uso: npx tsx scripts/whatsapp-cadastrar-canal-transmissao.mts <link-ou-codigo> <destino> [nome]\n" +
        `Destinos válidos: ${Object.values(Destino).join(", ")}`,
    );
    process.exit(1);
  }
  if (!Object.values(Destino).includes(destino)) {
    console.error(`Destino inválido: ${destino}. Valores aceitos: ${Object.values(Destino).join(", ")}`);
    process.exit(1);
  }

  const codigoConvite = extrairCodigoConvite(entrada);
  const { state, saveCreds } = await carregarEstadoDeAutenticacao(AUTH_DIR);
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      try {
        console.log(`Conectado! Resolvendo o convite "${codigoConvite}"...`);
        const meta = await sock.newsletterMetadata("invite", codigoConvite);
        if (!meta) {
          console.error("Convite não encontrado — confira o link.");
          process.exit(1);
        }

        console.log(`Canal: "${meta.name ?? "(sem nome)"}" — id: ${meta.id} — assinantes: ${meta.subscribers ?? "?"} — dono: ${meta.owner ?? "?"}`);

        const nome = nomeDoCanal(meta, destino, nomeArg);
        const existente = await prisma.canal.findUnique({
          where: { rede_idExterno: { rede: Rede.WHATSAPP, idExterno: meta.id } },
        });

        if (existente) {
          await prisma.canal.update({ where: { id: existente.id }, data: { nome, destino, ativo: true } });
          console.log(`Canal já existia — atualizado: "${nome}", destino ${destino}, ativo.`);
        } else {
          await prisma.canal.create({
            data: { nome, rede: Rede.WHATSAPP, destino, idExterno: meta.id, ativo: true },
          });
          console.log(`Canal criado: "${nome}", destino ${destino}. A fila de grupos (worker) já vai preencher ele sozinha.`);
        }

        console.log(
          "\nAtenção: só funciona de verdade se a conta logada nesta sessão do WhatsApp for dona ou admin do canal — senão o envio falha na hora de publicar.",
        );
      } catch (erro) {
        console.error("Falha:", erro);
        process.exitCode = 1;
      } finally {
        await prisma.$disconnect();
        process.exit();
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
