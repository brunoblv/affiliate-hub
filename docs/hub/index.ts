import "dotenv/config";

import { prisma } from "@/lib/database";
import { obterPublicador } from "@/lib/publicacao/publicadores";
import { registrar } from "@/lib/log";
import { formatarLocal } from "@/lib/agenda/fuso";

const INTERVALO_TICK_MS = 60_000;
/** Quantas publicações um tick processa. Baixo de propósito: espaça os posts. */
const LOTE = 5;
const MAX_TENTATIVAS = 4;
const ESPERA_ENTRE_TENTATIVAS_MIN = 10;

let rodando = false;
let encerrando = false;

/**
 * Reivindica publicações vencidas de forma atômica.
 *
 * FOR UPDATE SKIP LOCKED dentro da transação garante que dois workers (ou dois
 * ticks sobrepostos) nunca peguem a mesma linha. É o que substitui o BullMQ —
 * sem Redis, sem mais um serviço para cair.
 */
async function reivindicarPendentes(): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    const linhas = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM publicacoes
      WHERE status = 'PENDENTE'::"StatusPublicacao"
        AND "agendadaPara" <= now()
      ORDER BY "agendadaPara" ASC
      LIMIT ${LOTE}
      FOR UPDATE SKIP LOCKED
    `;

    if (linhas.length === 0) return [];

    const ids = linhas.map((linha) => linha.id);

    await tx.publicacao.updateMany({
      where: { id: { in: ids } },
      data: { status: "PUBLICANDO", tentativas: { increment: 1 } },
    });

    return ids;
  });
}

async function publicar(publicacaoId: string): Promise<void> {
  const publicacao = await prisma.publicacao.findUniqueOrThrow({
    where: { id: publicacaoId },
    include: { canal: true, produto: { select: { slug: true } } },
  });

  try {
    const publicador = obterPublicador(publicacao.canal);

    const resultado = await publicador.publicar({
      texto: publicacao.texto,
      imagemUrl: publicacao.imagemUrl ?? undefined,
      link: publicacao.linkDestino,
    });

    await prisma.publicacao.update({
      where: { id: publicacaoId },
      data: {
        status: "PUBLICADA",
        publicadaEm: new Date(),
        idPostExterno: resultado.idExterno,
        erro: null,
      },
    });

    await registrar("INFO", "PUBLICACAO", `Publicado em ${publicacao.canal.nome}`, {
      produto: publicacao.produto.slug,
      idExterno: resultado.idExterno,
    });
  } catch (erro) {
    await tratarFalha(publicacaoId, publicacao.tentativas, erro);
  }
}

/**
 * Falha não é terminal. Reagenda com espera até esgotar as tentativas — só aí
 * vira FALHOU e aparece no painel. Na v1 a primeira falha de rede matava o post
 * em silêncio.
 */
async function tratarFalha(publicacaoId: string, tentativas: number, erro: unknown): Promise<void> {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const esgotou = tentativas >= MAX_TENTATIVAS;

  await prisma.publicacao.update({
    where: { id: publicacaoId },
    data: esgotou
      ? { status: "FALHOU", erro: mensagem }
      : {
          status: "PENDENTE",
          erro: mensagem,
          agendadaPara: new Date(Date.now() + ESPERA_ENTRE_TENTATIVAS_MIN * 60_000),
        },
  });

  await registrar("ERRO", "PUBLICACAO", esgotou ? "Publicação falhou em definitivo" : "Publicação falhou, vai tentar de novo", {
    publicacaoId,
    tentativas,
    erro: mensagem,
  });
}

/**
 * Um tick. Roda em série e é aguardado antes do próximo — nada de setInterval
 * solto disparando ticks sobrepostos como na v1.
 */
async function tick(): Promise<void> {
  if (rodando || encerrando) return;
  rodando = true;

  try {
    const ids = await reivindicarPendentes();

    for (const id of ids) {
      if (encerrando) break;
      await publicar(id);
    }
  } catch (erro) {
    await registrar("ERRO", "WORKER", "Tick falhou", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  } finally {
    rodando = false;
  }
}

async function loop(): Promise<void> {
  console.log(`[worker] ativo — tick a cada ${INTERVALO_TICK_MS / 1000}s (agora: ${formatarLocal(new Date())})`);

  while (!encerrando) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_TICK_MS));
  }

  await prisma.$disconnect();
  console.log("[worker] encerrado");
  process.exit(0);
}

/** Termina o item em andamento antes de sair: nunca deixa linha presa em PUBLICANDO. */
function encerrar(sinal: string): void {
  console.log(`[worker] ${sinal} recebido, encerrando após o item atual...`);
  encerrando = true;
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));

void loop();
