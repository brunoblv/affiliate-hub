import { prisma, TipoPost, type Canal } from "@/lib/database";
import { FUSO_APP, inicioDoDia, lerHorario, paraUtc, partesNoFuso } from "./fuso";
import { INTERVALO_PADRAO_MIN, TETO_PADRAO } from "./janela";

/** Horário fixo das matérias de jornada no Facebook/Instagram (Brasília). */
export const HORA_JORNADA = "12:00";

const DIAS_MAXIMOS_DE_BUSCA = 90;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Próximo 12:00 (Brasília) livre neste canal: dia sem matéria de jornada e
 * slot das 12h sem conflito de intervalo com outra publicação.
 */
export async function proximoMeioDiaLivre(
  canal: Canal,
  apartirDe: Date = new Date(),
): Promise<Date | null> {
  const { hora, minuto } = lerHorario(HORA_JORNADA);
  const intervaloMin = canal.intervaloMinimoMin === 90 ? INTERVALO_PADRAO_MIN : canal.intervaloMinimoMin;
  const intervaloMs = Math.max(0, intervaloMin) * 60 * 1000;
  const tetoBruto = canal.tetoDiario === 6 ? TETO_PADRAO : canal.tetoDiario;
  const teto = Math.max(1, tetoBruto);

  const limite = new Date(apartirDe.getTime() + DIAS_MAXIMOS_DE_BUSCA * MS_POR_DIA);
  const ocupadas = await prisma.publicacao.findMany({
    where: {
      canalId: canal.id,
      status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
      agendadaPara: { gte: inicioDoDia(apartirDe), lte: limite },
    },
    select: {
      agendadaPara: true,
      post: { select: { tipo: true } },
    },
    orderBy: { agendadaPara: "asc" },
  });

  let cursor = inicioDoDia(apartirDe);

  for (let dias = 0; dias <= DIAS_MAXIMOS_DE_BUSCA; dias++) {
    const { ano, mes, dia } = partesNoFuso(cursor, FUSO_APP);
    const comecoDoDia = cursor.getTime();
    const fimDoDia = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP).getTime();
    const candidato = paraUtc(ano, mes, dia, hora, minuto, FUSO_APP);
    const candidatoMs = candidato.getTime();

    if (candidatoMs <= apartirDe.getTime()) {
      cursor = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP);
      continue;
    }

    const doDia = ocupadas.filter((p) => {
      const t = p.agendadaPara.getTime();
      return t >= comecoDoDia && t < fimDoDia;
    });

    if (doDia.length >= teto) {
      cursor = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP);
      continue;
    }

    const jaTemJornada = doDia.some((p) => p.post?.tipo === TipoPost.JORNADA);
    if (jaTemJornada) {
      cursor = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP);
      continue;
    }

    const conflita = doDia.some((p) => Math.abs(p.agendadaPara.getTime() - candidatoMs) < intervaloMs);
    if (conflita) {
      cursor = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP);
      continue;
    }

    return candidato;
  }

  return null;
}
