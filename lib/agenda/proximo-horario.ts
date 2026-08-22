import { prisma, type Canal } from "@/lib/database";
import { FUSO_APP, inicioDoDia, lerHorario, paraUtc, partesNoFuso } from "./fuso";

/** Até onde procurar depois da última publicação (ou de agora, se a fila estiver vazia). */
const DIAS_MAXIMOS_DE_BUSCA = 90;
const MAX_ITERACOES = 180;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Usado quando o canal foi salvo sem horários — o formulário deixa o campo vazio por padrão. */
export const HORARIOS_PADRAO = ["09:00", "13:00", "19:30"];

export interface ResultadoAgenda {
  agendadaPara: Date;
}

export function horariosDoCanal(canal: Canal): string[] {
  const bruto = Array.isArray(canal.horarios) ? canal.horarios : [];
  const textos = bruto
    .flatMap((item) => String(item).split(/[,\n]/))
    .map((texto) => texto.trim())
    .filter(Boolean);

  const validos: string[] = [];
  for (const texto of textos) {
    try {
      const { hora, minuto } = lerHorario(texto);
      validos.push(`${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`);
    } catch {
      throw new Error(`Horário inválido no canal "${canal.nome}": "${texto}". Use HH:mm.`);
    }
  }

  return validos.length > 0 ? [...new Set(validos)] : HORARIOS_PADRAO;
}

/**
 * Encontra o próximo horário livre de um canal, obedecendo, nesta ordem:
 *
 * 1. só horários configurados em `canal.horarios` (ou o padrão, se vazio);
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
  const horariosOrdenados = horariosDoCanal(canal)
    .map((texto) => lerHorario(texto))
    .sort((a, b) => a.hora - b.hora || a.minuto - b.minuto);

  const teto = Math.max(1, canal.tetoDiario);
  const intervaloMs = Math.max(0, canal.intervaloMinimoMin) * 60 * 1000;

  const ultima = await prisma.publicacao.findFirst({
    where: { canalId: canal.id, status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] } },
    orderBy: { agendadaPara: "desc" },
    select: { agendadaPara: true },
  });

  const ancora = Math.max(apartirDe.getTime(), ultima?.agendadaPara.getTime() ?? 0);
  const limite = new Date(ancora + DIAS_MAXIMOS_DE_BUSCA * MS_POR_DIA);

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

  let cursor = inicioDoDia(apartirDe);

  for (let dias = 0; dias <= MAX_ITERACOES && cursor.getTime() <= limite.getTime(); dias++) {
    const { ano, mes, dia } = partesNoFuso(cursor, FUSO_APP);
    const comecoDoDia = cursor.getTime();
    const fimDoDia = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP).getTime();

    const jaAgendadasNoDia = instantesOcupados.filter((t) => t >= comecoDoDia && t < fimDoDia).length;

    if (jaAgendadasNoDia < teto) {
      let vagasRestantes = teto - jaAgendadasNoDia;

      for (const { hora, minuto } of horariosOrdenados) {
        if (vagasRestantes <= 0) break;

        const candidato = paraUtc(ano, mes, dia, hora, minuto, FUSO_APP).getTime();

        if (candidato <= apartirDe.getTime()) continue;

        const conflita = instantesOcupados.some((t) => Math.abs(t - candidato) < intervaloMs);
        if (conflita) continue;

        return { agendadaPara: new Date(candidato) };
      }
    }

    const proximo = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP);
    if (proximo.getTime() <= cursor.getTime()) break;
    cursor = proximo;
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
