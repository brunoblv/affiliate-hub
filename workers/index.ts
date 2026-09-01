import "dotenv/config";

import { prisma } from "@/lib/database";
import { executarPublicacao } from "@/lib/publicacao/executar";
import { registrar } from "@/lib/log";
import { formatarLocal, partesNoFuso } from "@/lib/agenda/fuso";
import { reagendarPublicacoesForaDaJanela, aplicarJanelaPadraoNosCanais } from "@/lib/agenda/proximo-horario";
import { sincronizarPrecosMercadoLivre } from "@/lib/mercado-livre/sincronizar-precos";
import { sincronizarPrecosShopee } from "@/lib/shopee/sincronizar-precos";
import { descobrirOfertasShopee } from "@/lib/shopee/descobrir-ofertas";
import { gerarLandingsDoDia } from "@/lib/vitrine/gerar";

const INTERVALO_TICK_MS = 60_000;
/** Quantas publicações um tick processa. Baixo de propósito: espaça os posts. */
const LOTE = 5;
/** Preço de afiliado não muda a cada minuto — loop independente do de publicação. */
const INTERVALO_SYNC_PRECOS_MS = 6 * 60 * 60 * 1000;
/** Ofertas do dia — uma leva só, uma vez por dia. */
const INTERVALO_DESCOBERTA_SHOPEE_MS = 24 * 60 * 60 * 1000;
/** Landing da vitrine: confere a cada 15 min; gera a partir das 6h (TZ_APP). */
const INTERVALO_VITRINE_MS = 15 * 60 * 1000;
const HORA_VITRINE = 6;

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

/**
 * Um tick. Roda em série e é aguardado antes do próximo — nada de setInterval
 * solto disparando ticks sobrepostos.
 */
async function tick(): Promise<void> {
  if (rodando || encerrando) return;
  rodando = true;

  try {
    await reagendarPublicacoesForaDaJanela();
    const ids = await reivindicarPendentes();

    for (const id of ids) {
      if (encerrando) break;
      await executarPublicacao(id);
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
  try {
    await aplicarJanelaPadraoNosCanais();
    const movidas = await reagendarPublicacoesForaDaJanela();
    if (movidas > 0) {
      console.log(`[worker] ${movidas} publicação(ões) fora de 09:00–21:00 (Brasília) reagendada(s)`);
    }
  } catch (erro) {
    console.error("[worker] falha ao reagendar publicações fora da janela", erro);
  }

  while (!encerrando) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_TICK_MS));
  }

  await prisma.$disconnect();
  console.log("[worker] encerrado");
  process.exit(0);
}

/**
 * Loop independente do de publicação: sincroniza preço/nome/imagem dos
 * produtos do Mercado Livre a cada INTERVALO_SYNC_PRECOS_MS. Roda em paralelo,
 * sem competir pelo `rodando` do tick de publicação.
 */
async function loopSincronizacaoPrecos(): Promise<void> {
  while (!encerrando) {
    try {
      await sincronizarPrecosMercadoLivre();
    } catch (erro) {
      await registrar("ERRO", "PRODUTO_SYNC", "Sync de preços do Mercado Livre falhou", {
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_SYNC_PRECOS_MS));
  }
}

/** Loop independente, mesmo intervalo do sync do Mercado Livre — sincroniza preço/nome/imagem da Shopee. */
async function loopSincronizacaoPrecosShopee(): Promise<void> {
  while (!encerrando) {
    try {
      await sincronizarPrecosShopee();
    } catch (erro) {
      await registrar("ERRO", "PRODUTO_SYNC", "Sync de preços da Shopee falhou", {
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_SYNC_PRECOS_MS));
  }
}

/** Loop independente: descobre e importa as ofertas do dia da Shopee, uma vez por dia. */
async function loopDescobertaShopee(): Promise<void> {
  while (!encerrando) {
    try {
      await descobrirOfertasShopee();
    } catch (erro) {
      await registrar("ERRO", "PRODUTO_DESCOBERTA", "Descoberta automática da Shopee falhou", {
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_DESCOBERTA_SHOPEE_MS));
  }
}

/** Job da vitrine: a partir das 6h no fuso da operação; idempotente no mesmo dia. */
async function loopLandingDiaria(): Promise<void> {
  while (!encerrando) {
    try {
      const hora = partesNoFuso(new Date()).hora;
      if (hora >= HORA_VITRINE) {
        await gerarLandingsDoDia();
      }
    } catch (erro) {
      await registrar("ERRO", "VITRINE", "Job diário da vitrine falhou", {
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_VITRINE_MS));
  }
}

/** Termina o item em andamento antes de sair: nunca deixa linha presa em PUBLICANDO. */
function encerrar(sinal: string): void {
  console.log(`[worker] ${sinal} recebido, encerrando após o item atual...`);
  encerrando = true;
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));

void loop();
void loopSincronizacaoPrecos();
void loopSincronizacaoPrecosShopee();
void loopDescobertaShopee();
void loopLandingDiaria();
