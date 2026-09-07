import { access } from "node:fs/promises";
import path from "node:path";
import { prisma, Rede, StatusPublicacao, type NivelLog } from "@/lib/database";
import { diagnosticarFilaWhatsapp } from "@/lib/agenda/fila-diagnostico";
import { formatarHora, formatarLocal } from "@/lib/agenda/fuso";
import { diretorioAuthWhatsApp } from "@/lib/whatsapp/auth-dir";

export type StatusEtapa = "ok" | "alerta" | "erro";

export interface EtapaDiagnostico {
  id: string;
  titulo: string;
  status: StatusEtapa;
  resumo: string;
  detalhe?: string;
}

export interface DiagnosticoPipeline {
  gargalo: EtapaDiagnostico | null;
  etapas: EtapaDiagnostico[];
}

const JANELA_LOG_MS = 24 * 60 * 60 * 1000;

async function arquivoExiste(caminho: string): Promise<boolean> {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

async function ultimoLog(filtro: {
  area?: string | string[];
  nivel?: NivelLog | NivelLog[];
  mensagemContem?: string;
}) {
  return prisma.log.findFirst({
    where: {
      criadoEm: { gte: new Date(Date.now() - JANELA_LOG_MS) },
      ...(filtro.area
        ? { area: Array.isArray(filtro.area) ? { in: filtro.area } : filtro.area }
        : {}),
      ...(filtro.nivel
        ? { nivel: Array.isArray(filtro.nivel) ? { in: filtro.nivel } : filtro.nivel }
        : {}),
      ...(filtro.mensagemContem ? { mensagem: { contains: filtro.mensagemContem, mode: "insensitive" } } : {}),
    },
    orderBy: { criadoEm: "desc" },
    select: { mensagem: true, nivel: true, area: true, criadoEm: true, contexto: true },
  });
}

function etapa(
  id: string,
  titulo: string,
  status: StatusEtapa,
  resumo: string,
  detalhe?: string,
): EtapaDiagnostico {
  return { id, titulo, status, resumo, detalhe };
}

export async function diagnosticarPipeline(): Promise<DiagnosticoPipeline> {
  const agora = new Date();
  const desde = new Date(Date.now() - JANELA_LOG_MS);

  const [fila, canaisWa, credsOk, qrLog, closeLog, conectadoLog, publicada, comErro, geminiLog, shopeeLog, insightsLog] =
    await Promise.all([
      diagnosticarFilaWhatsapp(),
      prisma.canal.findMany({
        where: { rede: Rede.WHATSAPP },
        select: { nome: true, ativo: true, idExterno: true },
      }),
      arquivoExiste(path.join(diretorioAuthWhatsApp(), "creds.json")),
      ultimoLog({ area: "PUBLICACAO", mensagemContem: "QR" }),
      ultimoLog({ area: "PUBLICACAO", mensagemContem: "conexão fechada" }),
      ultimoLog({ area: "PUBLICACAO", mensagemContem: "WhatsApp: conectado" }),
      prisma.publicacao.findFirst({
        where: { canal: { rede: Rede.WHATSAPP }, status: StatusPublicacao.PUBLICADA, publicadaEm: { gte: desde } },
        orderBy: { publicadaEm: "desc" },
        select: { publicadaEm: true, canal: { select: { nome: true } }, produto: { select: { nome: true } } },
      }),
      prisma.publicacao.findMany({
        where: {
          canal: { rede: Rede.WHATSAPP },
          atualizadoEm: { gte: desde },
          OR: [{ status: StatusPublicacao.FALHOU }, { erro: { not: null } }],
        },
        orderBy: { atualizadoEm: "desc" },
        take: 3,
        select: {
          status: true,
          erro: true,
          agendadaPara: true,
          atualizadoEm: true,
          canal: { select: { nome: true } },
          produto: { select: { nome: true } },
        },
      }),
      ultimoLog({ area: "CONTEUDO" }),
      ultimoLog({ area: "PRODUTO_SYNC", nivel: ["ERRO", "ALERTA"] }),
      ultimoLog({ area: "INSIGHTS", nivel: "ERRO" }),
    ]);

  const ativos = canaisWa.filter((c) => c.ativo);
  const semJid = ativos.filter((c) => !c.idExterno?.trim());

  const worker: EtapaDiagnostico = !fila.workerAtivo
    ? etapa(
        "worker",
        "1. Worker",
        "erro",
        fila.workerUltimoPulso
          ? `Parado — último pulso ${formatarLocal(fila.workerUltimoPulso)}.`
          : "Nenhum pulso registrado. O `next start` não publica.",
        "Na VPS: `pm2 status` e `pm2 restart affiliate-hub-workers`.",
      )
    : etapa(
        "worker",
        "1. Worker",
        "ok",
        `Rodando (pulso ${fila.workerUltimoPulso ? formatarLocal(fila.workerUltimoPulso) : formatarLocal(agora)}).`,
      );

  const canais: EtapaDiagnostico =
    ativos.length === 0
      ? etapa("canais", "2. Canal WhatsApp", "alerta", "Nenhum canal WhatsApp ativo.", "Cadastre o grupo em Canais e cole o JID.")
      : semJid.length > 0
        ? etapa(
            "canais",
            "2. Canal WhatsApp",
            "erro",
            `${semJid.map((c) => c.nome).join(", ")} sem JID — o envio não tem destino.`,
            "Abra o canal e grave o identificador externo do grupo (JID).",
          )
        : etapa(
            "canais",
            "2. Canal WhatsApp",
            "ok",
            `${ativos.length} grupo(s): ${ativos.map((c) => c.nome).join(", ")}.`,
          );

  const qrRecente = qrLog && (!conectadoLog || qrLog.criadoEm >= conectadoLog.criadoEm);
  const closeDepoisDoOpen = closeLog && (!conectadoLog || closeLog.criadoEm >= conectadoLog.criadoEm);

  let sessao: EtapaDiagnostico;
  if (!credsOk) {
    sessao = etapa(
      "sessao",
      "3. Sessão WhatsApp",
      "erro",
      "Não há credenciais salvas (creds.json).",
      "Na VPS, no mesmo diretório do worker: `npm run whatsapp:login`.",
    );
  } else if (qrRecente && qrLog) {
    sessao = etapa(
      "sessao",
      "3. Sessão WhatsApp",
      "erro",
      `Sessão pediu QR (${formatarLocal(qrLog.criadoEm)}).`,
      "Expirou. Rode `npm run whatsapp:login` de novo.",
    );
  } else if (closeDepoisDoOpen && closeLog) {
    const substituida = /substituída|440/i.test(closeLog.mensagem + JSON.stringify(closeLog.contexto ?? {}));
    sessao = etapa(
      "sessao",
      "3. Sessão WhatsApp",
      "alerta",
      substituida
        ? `Sessão substituída (${formatarLocal(closeLog.criadoEm)}) — outro WhatsApp Web no mesmo número.`
        : `Conexão caiu (${formatarLocal(closeLog.criadoEm)}). O próximo envio tenta reconectar.`,
      substituida ? "Feche a outra sessão ou rode `npm run whatsapp:login`." : undefined,
    );
  } else {
    sessao = etapa(
      "sessao",
      "3. Sessão WhatsApp",
      "ok",
      conectadoLog
        ? `Credenciais ok. Última conexão ${formatarLocal(conectadoLog.criadoEm)}.`
        : "Credenciais ok. Ainda não houve conexão neste ciclo.",
    );
  }

  let filaEtapa: EtapaDiagnostico;
  if (fila.publicandoWhatsapp > 0) {
    filaEtapa = etapa(
      "fila",
      "4. Fila",
      "erro",
      `${fila.publicandoWhatsapp} item(ns) presos em PUBLICANDO — o worker travou no envio.`,
      "Olhe `pm2 logs affiliate-hub-workers`. Se pediu QR, rode `npm run whatsapp:login`.",
    );
  } else if (fila.vencidasWhatsapp > 0) {
    filaEtapa = etapa(
      "fila",
      "4. Fila",
      fila.workerAtivo ? "erro" : "alerta",
      `${fila.vencidasWhatsapp} pendente(s) já no horário e o worker não levou.`,
      fila.workerAtivo
        ? "O tick pega PENDENTE com horário vencido. Se persistir, a sessão está bloqueando o envio."
        : "Sem worker a fila não anda.",
    );
  } else if (fila.aguardandoHorarioWhatsapp > 0) {
    const proxima = fila.proximaWhatsapp ? ` Próxima às ${formatarHora(fila.proximaWhatsapp)}.` : "";
    filaEtapa = etapa(
      "fila",
      "4. Fila",
      "ok",
      `Nada atrasado. ${fila.aguardandoHorarioWhatsapp} no futuro (10–20 min, 09:00–21:00).${proxima}`,
    );
  } else {
    filaEtapa = etapa(
      "fila",
      "4. Fila",
      "alerta",
      "Nenhum pendente de WhatsApp. A cobertura automática dos grupos pode não estar enchendo a fila.",
    );
  }

  const falhouDefinitivo = comErro.filter((p) => p.status === StatusPublicacao.FALHOU);
  let envio: EtapaDiagnostico;
  if (falhouDefinitivo[0]) {
    const recente = falhouDefinitivo[0];
    const falhaMaisNovaQueSucesso = !publicada?.publicadaEm || recente.atualizadoEm >= publicada.publicadaEm;
    envio = etapa(
      "envio",
      "5. Envio",
      falhaMaisNovaQueSucesso ? "erro" : "alerta",
      `${recente.produto?.nome ?? "Publicação"} em ${recente.canal.nome}: ${recente.erro ?? "FALHOU"}.`,
      publicada?.publicadaEm
        ? `Último sucesso: ${formatarLocal(publicada.publicadaEm)}.`
        : "Nenhum envio com sucesso nas últimas 24h.",
    );
  } else if (comErro[0]) {
    const recente = comErro[0];
    envio = etapa(
      "envio",
      "5. Envio",
      "alerta",
      `Retentativa: ${recente.erro ?? "erro gravado na publicação"}.`,
      `Horário ${formatarLocal(recente.agendadaPara)}.`,
    );
  } else if (publicada?.publicadaEm) {
    envio = etapa(
      "envio",
      "5. Envio",
      "ok",
      `Último post saiu ${formatarLocal(publicada.publicadaEm)} (${publicada.canal.nome}).`,
    );
  } else {
    envio = etapa("envio", "5. Envio", "alerta", "Nenhum WhatsApp publicado nas últimas 24h.");
  }

  const geminiTimeout = geminiLog && /não respondeu em/i.test(geminiLog.mensagem);
  const gemini: EtapaDiagnostico = !process.env.GEMINI_API_KEY
    ? etapa("gemini", "6. Legenda (Gemini)", "alerta", "Sem GEMINI_API_KEY — a fila usa o template fixo.")
    : geminiTimeout
      ? etapa(
          "gemini",
          "6. Legenda (Gemini)",
          "alerta",
          geminiLog.mensagem,
          "O post sai mesmo assim, com o texto padrão. Não bloqueia o WhatsApp.",
        )
      : etapa("gemini", "6. Legenda (Gemini)", "ok", "Chave presente. Timeouts recentes não estão bloqueando o envio.");

  const shopee: EtapaDiagnostico =
    !process.env.SHOPEE_APP_ID || !process.env.SHOPEE_SECRET
      ? etapa("shopee", "7. Link Shopee", "alerta", "Shopee não configurada no .env.")
      : shopeeLog
        ? etapa(
            "shopee",
            "7. Link Shopee",
            "alerta",
            shopeeLog.mensagem,
            "O post usa o link de afiliado já cadastrado se a etiqueta falhar. Não deveria impedir o envio.",
          )
        : etapa("shopee", "7. Link Shopee", "ok", "Sem falha recente de API.");

  const insights: EtapaDiagnostico = insightsLog
    ? etapa(
        "insights",
        "8. Insights Facebook",
        "alerta",
        insightsLog.mensagem,
        "Só telemetria da página. Não publica WhatsApp.",
      )
    : etapa("insights", "8. Insights Facebook", "ok", "Sem falha recente.");

  const etapas = [worker, canais, sessao, filaEtapa, envio, gemini, shopee, insights];
  const gargalo = etapas.find((item) => item.status === "erro") ?? etapas.find((item) => item.status === "alerta") ?? null;

  return { gargalo, etapas };
}
