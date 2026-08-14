import { prisma, type Canal } from "@/lib/database";
import { FUSO_APP, inicioDoDia, lerHorario, paraUtc, partesNoFuso } from "./fuso";

/** Até onde procurar antes de desistir. */
const DIAS_MAXIMOS_DE_BUSCA = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface ResultadoAgenda {
  agendadaPara: Date;
}

/**
 * Encontra o próximo horário livre de um canal, obedecendo, nesta ordem:
 *
 * 1. só horários configurados em `canal.horarios`;
 * 2. no futuro (nunca reagenda para trás);
 * 3. `intervaloMinimoMin` desde a publicação vizinha mais próxima;
 * 4. `tetoDiario` de publicações naquele dia;
 * 5. slot ainda não ocupado por outra publicação.
 *
 * A regra de cooldown do produto é checada à parte, em `produtoEmCooldown`,
 * porque ela decide se vale agendar — não qual horário usar.
 */
export async function proximoHorarioLivre(
  canal: Canal,
  apartirDe: Date = new Date(),
): Promise<ResultadoAgenda | null> {
  const horarios = (canal.horarios as unknown as string[]) ?? [];

  if (horarios.length === 0) return null;

  const horariosOrdenados = [...horarios]
    .map((texto) => lerHorario(texto))
    .sort((a, b) => a.hora - b.hora || a.minuto - b.minuto);

  const limite = new Date(apartirDe.getTime() + DIAS_MAXIMOS_DE_BUSCA * MS_POR_DIA);

  // Carrega de uma vez tudo que já está reservado na janela de busca.
  const ocupadas = await prisma.publicacao.findMany({
    where: {
      canalId: canal.id,
      status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
      agendadaPara: { gte: new Date(apartirDe.getTime() - MS_POR_DIA), lte: limite },
    },
    select: { agendadaPara: true },
    orderBy: { agendadaPara: "asc" },
  });

  const instantesOcupados = ocupadas.map((p) => p.agendadaPara.getTime());
  const intervaloMs = canal.intervaloMinimoMin * 60 * 1000;

  for (let deslocamentoDias = 0; deslocamentoDias <= DIAS_MAXIMOS_DE_BUSCA; deslocamentoDias++) {
    const diaBase = new Date(apartirDe.getTime() + deslocamentoDias * MS_POR_DIA);
    const { ano, mes, dia } = partesNoFuso(diaBase, FUSO_APP);

    const comecoDoDia = inicioDoDia(diaBase).getTime();
    const fimDoDia = comecoDoDia + MS_POR_DIA;

    const jaAgendadasNoDia = instantesOcupados.filter((t) => t >= comecoDoDia && t < fimDoDia).length;

    if (jaAgendadasNoDia >= canal.tetoDiario) continue;

    let vagasRestantes = canal.tetoDiario - jaAgendadasNoDia;

    for (const { hora, minuto } of horariosOrdenados) {
      if (vagasRestantes <= 0) break;

      const candidato = paraUtc(ano, mes, dia, hora, minuto).getTime();

      if (candidato <= apartirDe.getTime()) continue;

      const conflita = instantesOcupados.some((t) => Math.abs(t - candidato) < intervaloMs);
      if (conflita) continue;

      return { agendadaPara: new Date(candidato) };
    }
  }

  return null;
}

/**
 * true se o produto já foi publicado neste canal dentro do cooldown.
 * Evita a sensação de spam de repetir o mesmo item na mesma página.
 */
export async function produtoEmCooldown(canal: Canal, produtoId: string): Promise<boolean> {
  if (canal.cooldownDias <= 0) return false;

  const desde = new Date(Date.now() - canal.cooldownDias * MS_POR_DIA);

  const recente = await prisma.publicacao.findFirst({
    where: {
      canalId: canal.id,
      produtoId,
      OR: [
        { status: "PUBLICADA", publicadaEm: { gte: desde } },
        { status: { in: ["PENDENTE", "PUBLICANDO"] } },
      ],
    },
    select: { id: true },
  });

  return recente !== null;
}
