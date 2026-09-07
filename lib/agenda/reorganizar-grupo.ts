import { prisma, StatusPublicacao, type Canal } from "@/lib/database";
import { FUSO_APP, inicioDoDia, paraUtc, partesNoFuso } from "./fuso";
import {
  avancarParaJanela,
  ehCanalDeGrupo,
  estaNaJanelaDePublicacao,
  INTERVALO_GRUPO_MIN,
  minutosAleatoriosDoGrupo,
  TETO_PADRAO,
} from "./janela";
import { aplicarJanelaPadraoNosCanais } from "./proximo-horario";
import { registrar } from "@/lib/log";

const INTERVALO_GRUPO_MS = INTERVALO_GRUPO_MIN * 60 * 1000;
const MAX_ITERACOES = 180;
const DIAS_MAXIMOS = 90;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface ResultadoReorganizarGrupo {
  canalId: string;
  canal: string;
  movidas: number;
  pendentes: number;
}

function tetoDoCanal(canal: Canal): number {
  const tetoBruto = canal.tetoDiario === 6 ? TETO_PADRAO : canal.tetoDiario;
  return Math.max(1, tetoBruto || TETO_PADRAO);
}

function origemDaChave(p: {
  id: string;
  produtoId: string | null;
  postId: string | null;
  landingDiariaId: string | null;
  listaOfertaId: string | null;
}): string {
  return p.produtoId ?? p.postId ?? p.landingDiariaId ?? p.listaOfertaId ?? p.id;
}

/** Próximos horários livres da janela 09:00–21h, sem considerar os pendentes (eles vão ser movidos). */
export function alocarHorariosDoGrupo(params: {
  tetoDiario: number;
  apartirDe: Date;
  ocupadas: Date[];
  quantidade: number;
}): Date[] {
  const teto = Math.max(1, params.tetoDiario);
  const ocupadas = params.ocupadas.map((d) => d.getTime()).sort((a, b) => a - b);
  const saida: Date[] = [];
  let piso = params.apartirDe.getTime();

  for (let n = 0; n < params.quantidade; n++) {
    const extraMin = minutosAleatoriosDoGrupo() - INTERVALO_GRUPO_MIN;
    let candidato = avancarParaJanela(new Date(piso + extraMin * 60 * 1000));
    let achou: Date | null = null;

    for (let i = 0; i < MAX_ITERACOES; i++) {
      if (candidato.getTime() > params.apartirDe.getTime() + DIAS_MAXIMOS * MS_POR_DIA) break;

      candidato = avancarParaJanela(candidato);
      const { ano, mes, dia } = partesNoFuso(candidato, FUSO_APP);
      const comecoDoDia = inicioDoDia(candidato).getTime();
      const fimDoDia = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP).getTime();
      const noDia = ocupadas.filter((t) => t >= comecoDoDia && t < fimDoDia).length;

      if (noDia >= teto) {
        candidato = paraUtc(ano, mes, dia + 1, 9, 0, FUSO_APP);
        continue;
      }

      const candidatoMs = candidato.getTime();
      if (candidatoMs <= params.apartirDe.getTime()) {
        candidato = new Date(params.apartirDe.getTime() + 60_000);
        continue;
      }
      if (!estaNaJanelaDePublicacao(candidato)) {
        candidato = avancarParaJanela(new Date(candidatoMs + 60_000));
        continue;
      }
      if (ocupadas.some((t) => Math.abs(t - candidatoMs) < INTERVALO_GRUPO_MS)) {
        candidato = new Date(candidatoMs + 60_000);
        continue;
      }

      achou = candidato;
      break;
    }

    if (!achou) break;
    saida.push(achou);
    ocupadas.push(achou.getTime());
    ocupadas.sort((a, b) => a - b);
    piso = achou.getTime() + INTERVALO_GRUPO_MS;
  }

  return saida;
}

/**
 * Reempacota os PENDENTE de um grupo WhatsApp/Telegram a partir de agora,
 * na janela 09:00–21:00 (10–20 min). PUBLICADA/PUBLICANDO não saem do lugar.
 */
export async function reorganizarFilaDoGrupo(canalId: string): Promise<ResultadoReorganizarGrupo> {
  await aplicarJanelaPadraoNosCanais();

  const canal = await prisma.canal.findUnique({ where: { id: canalId } });
  if (!canal) {
    throw new Error("Canal não encontrado.");
  }
  if (!ehCanalDeGrupo(canal.rede)) {
    throw new Error("Só dá para reorganizar fila de WhatsApp ou Telegram.");
  }

  const pendentes = await prisma.publicacao.findMany({
    where: { canalId: canal.id, status: StatusPublicacao.PENDENTE },
    orderBy: { agendadaPara: "asc" },
    select: {
      id: true,
      produtoId: true,
      postId: true,
      landingDiariaId: true,
      listaOfertaId: true,
    },
  });

  if (pendentes.length === 0) {
    return { canalId: canal.id, canal: canal.nome, movidas: 0, pendentes: 0 };
  }

  const agora = new Date();
  const ocupadas = await prisma.publicacao.findMany({
    where: {
      canalId: canal.id,
      status: { in: [StatusPublicacao.PUBLICADA, StatusPublicacao.PUBLICANDO] },
      agendadaPara: { gte: new Date(agora.getTime() - MS_POR_DIA) },
    },
    select: { agendadaPara: true },
  });

  const horarios = alocarHorariosDoGrupo({
    tetoDiario: tetoDoCanal(canal),
    apartirDe: agora,
    ocupadas: ocupadas.map((p) => p.agendadaPara),
    quantidade: pendentes.length,
  });

  const moviveis = pendentes.slice(0, horarios.length);
  const marca = Date.now();

  await prisma.$transaction(
    async (tx) => {
      for (const pub of moviveis) {
        await tx.publicacao.update({
          where: { id: pub.id },
          data: { chaveIdempotencia: `reorg:${pub.id}:${marca}` },
        });
      }

      for (let i = 0; i < moviveis.length; i++) {
        const pub = moviveis[i]!;
        const quando = horarios[i]!;
        await tx.publicacao.update({
          where: { id: pub.id },
          data: {
            agendadaPara: quando,
            erro: null,
            chaveIdempotencia: `${origemDaChave(pub)}:${canal.id}:${quando.toISOString()}`,
          },
        });
      }
    },
    { timeout: 30_000 },
  );

  await registrar("INFO", "AGENDA", `Fila reorganizada em ${canal.nome}`, {
    canal: canal.nome,
    rede: canal.rede,
    movidas: moviveis.length,
    pendentes: pendentes.length,
  });

  return {
    canalId: canal.id,
    canal: canal.nome,
    movidas: moviveis.length,
    pendentes: pendentes.length,
  };
}
