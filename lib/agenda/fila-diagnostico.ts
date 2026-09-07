import { prisma, Rede, StatusPublicacao } from "@/lib/database";

const WORKER_AUSENTE_MS = 8 * 60 * 1000;

export interface DiagnosticoFila {
  workerAtivo: boolean;
  workerUltimoPulso: Date | null;
  vencidasWhatsapp: number;
  aguardandoHorarioWhatsapp: number;
  publicandoWhatsapp: number;
  proximaWhatsapp: Date | null;
  ultimoErro: { mensagem: string; quando: Date; area: string } | null;
}

export async function diagnosticarFilaWhatsapp(): Promise<DiagnosticoFila> {
  const agora = new Date();
  const [pulso, vencidasWhatsapp, aguardandoHorarioWhatsapp, publicandoWhatsapp, proxima, ultimoErro] =
    await Promise.all([
      prisma.log.findFirst({
        where: { area: "WORKER", mensagem: "pulso" },
        orderBy: { criadoEm: "desc" },
        select: { criadoEm: true },
      }),
      prisma.publicacao.count({
        where: {
          status: StatusPublicacao.PENDENTE,
          agendadaPara: { lte: agora },
          canal: { rede: Rede.WHATSAPP },
        },
      }),
      prisma.publicacao.count({
        where: {
          status: StatusPublicacao.PENDENTE,
          agendadaPara: { gt: agora },
          canal: { rede: Rede.WHATSAPP },
        },
      }),
      prisma.publicacao.count({
        where: {
          status: StatusPublicacao.PUBLICANDO,
          canal: { rede: Rede.WHATSAPP },
        },
      }),
      prisma.publicacao.findFirst({
        where: {
          status: StatusPublicacao.PENDENTE,
          agendadaPara: { gt: agora },
          canal: { rede: Rede.WHATSAPP },
        },
        orderBy: { agendadaPara: "asc" },
        select: { agendadaPara: true },
      }),
      prisma.log.findFirst({
        where: {
          nivel: "ERRO",
          area: { in: ["WORKER", "PUBLICACAO"] },
          criadoEm: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { criadoEm: "desc" },
        select: { mensagem: true, criadoEm: true, area: true },
      }),
    ]);

  return {
    workerAtivo: pulso ? agora.getTime() - pulso.criadoEm.getTime() < WORKER_AUSENTE_MS : false,
    workerUltimoPulso: pulso?.criadoEm ?? null,
    vencidasWhatsapp,
    aguardandoHorarioWhatsapp,
    publicandoWhatsapp,
    proximaWhatsapp: proxima?.agendadaPara ?? null,
    ultimoErro: ultimoErro
      ? { mensagem: ultimoErro.mensagem, quando: ultimoErro.criadoEm, area: ultimoErro.area }
      : null,
  };
}
