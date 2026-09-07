import { ContentType, Rede, prisma, type Canal } from "@/lib/database";
import { FUSO_APP, inicioDoDia, lerHorario, paraUtc, partesNoFuso } from "./fuso";
import {
  avancarParaJanela,
  ehCanalDeGrupo,
  estaNaJanelaDePublicacao,
  gerarHorariosDaJanela,
  INTERVALO_GRUPO_MIN,
  INTERVALO_PADRAO_MIN,
  minutosAleatoriosDoGrupo,
  TETO_PADRAO,
} from "./janela";

export {
  estaNaJanelaDePublicacao,
  gerarHorariosDaJanela,
  HORARIOS_PADRAO,
  INTERVALO_PADRAO_MIN,
  JANELA_FIM,
  JANELA_INICIO,
  rotuloJanela,
  TETO_PADRAO,
  tetoDaJanela,
} from "./janela";

/** Até onde procurar depois da última publicação (ou de agora, se a fila estiver vazia). */
const DIAS_MAXIMOS_DE_BUSCA = 90;
const MAX_ITERACOES = 180;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface ResultadoAgenda {
  agendadaPara: Date;
}

export function horariosDoCanal(canal: Canal): string[] {
  const intervalo = canal.intervaloMinimoMin === 90 ? INTERVALO_PADRAO_MIN : canal.intervaloMinimoMin || INTERVALO_PADRAO_MIN;
  return gerarHorariosDaJanela(intervalo);
}

/**
 * Encontra o próximo horário livre de um canal, obedecendo, nesta ordem:
 *
 * 1. só horários da janela 09:00–21:00 (Brasília);
 * 2. no futuro (nunca reagenda para trás);
 * 3. intervalo desde a vizinha: 10–20 min aleatórios em WhatsApp/Telegram,
 *    `intervaloMinimoMin` (grade) nas demais redes;
 * 4. `tetoDiario` de publicações naquele dia;
 * 5. slot ainda não ocupado por outra publicação.
 *
 * A regra de cooldown do produto é checada à parte, em `produtoEmCooldown`,
 * porque ela decide se vale agendar — não qual horário usar.
 *
 * Quando `contentType` é OFERTA_INDIVIDUAL e o canal é FACEBOOK_PAGE, soma-se
 * mais uma condição: `tetoOfertaIndividualDiario` daquele content_type no dia
 * (regra 1 de docs/hub/regras-postagem-facebook.md) — independente do
 * `tetoDiario` geral do canal, que continua valendo para os demais tipos.
 */
export async function proximoHorarioLivre(
  canal: Canal,
  apartirDe: Date = new Date(),
  excluirPublicacaoId?: string,
  contentType?: ContentType,
): Promise<ResultadoAgenda | null> {
  await aplicarJanelaPadraoNosCanais();

  const atual = await prisma.canal.findUnique({ where: { id: canal.id } });
  const canalEfetivo = atual ?? canal;

  if (ehCanalDeGrupo(canalEfetivo.rede)) {
    return proximoHorarioGrupo(canalEfetivo, apartirDe, excluirPublicacaoId);
  }

  const horariosOrdenados = horariosDoCanal(canalEfetivo)
    .map((texto) => lerHorario(texto))
    .sort((a, b) => a.hora - b.hora || a.minuto - b.minuto);

  const tetoBruto = canalEfetivo.tetoDiario === 6 ? TETO_PADRAO : canalEfetivo.tetoDiario;
  const teto = Math.max(1, tetoBruto);
  const intervaloMin =
    canalEfetivo.intervaloMinimoMin === 90 ? INTERVALO_PADRAO_MIN : canalEfetivo.intervaloMinimoMin;
  const intervaloMs = Math.max(0, intervaloMin) * 60 * 1000;

  const ultima = await prisma.publicacao.findFirst({
    where: {
      canalId: canalEfetivo.id,
      status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
      ...(excluirPublicacaoId ? { id: { not: excluirPublicacaoId } } : {}),
    },
    orderBy: { agendadaPara: "desc" },
    select: { agendadaPara: true },
  });

  const ancora = Math.max(apartirDe.getTime(), ultima?.agendadaPara.getTime() ?? 0);
  const limite = new Date(ancora + DIAS_MAXIMOS_DE_BUSCA * MS_POR_DIA);

  const ocupadas = await prisma.publicacao.findMany({
    where: {
      canalId: canalEfetivo.id,
      status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
      agendadaPara: { gte: new Date(apartirDe.getTime() - MS_POR_DIA), lte: limite },
      ...(excluirPublicacaoId ? { id: { not: excluirPublicacaoId } } : {}),
    },
    select: { agendadaPara: true, contentType: true },
    orderBy: { agendadaPara: "asc" },
  });

  const instantesOcupados = ocupadas.map((p) => p.agendadaPara.getTime());

  const limitarOfertaIndividual =
    contentType === ContentType.OFERTA_INDIVIDUAL && canalEfetivo.rede === Rede.FACEBOOK_PAGE;
  const instantesOfertaIndividual = limitarOfertaIndividual
    ? ocupadas.filter((p) => p.contentType === ContentType.OFERTA_INDIVIDUAL).map((p) => p.agendadaPara.getTime())
    : [];
  const tetoOfertaIndividual = Math.max(0, canalEfetivo.tetoOfertaIndividualDiario);

  let cursor = inicioDoDia(apartirDe);

  for (let dias = 0; dias <= MAX_ITERACOES && cursor.getTime() <= limite.getTime(); dias++) {
    const { ano, mes, dia } = partesNoFuso(cursor, FUSO_APP);
    const comecoDoDia = cursor.getTime();
    const fimDoDia = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP).getTime();

    const jaAgendadasNoDia = instantesOcupados.filter((t) => t >= comecoDoDia && t < fimDoDia).length;
    const ofertaIndividualNoDia = limitarOfertaIndividual
      ? instantesOfertaIndividual.filter((t) => t >= comecoDoDia && t < fimDoDia).length
      : 0;
    const tetoOfertaAtingido = limitarOfertaIndividual && ofertaIndividualNoDia >= tetoOfertaIndividual;

    if (jaAgendadasNoDia < teto && !tetoOfertaAtingido) {
      let vagasRestantes = teto - jaAgendadasNoDia;

      for (const { hora, minuto } of horariosOrdenados) {
        if (vagasRestantes <= 0) break;

        const candidato = paraUtc(ano, mes, dia, hora, minuto, FUSO_APP);
        const candidatoMs = candidato.getTime();

        if (candidatoMs <= apartirDe.getTime()) continue;
        if (!estaNaJanelaDePublicacao(candidato)) continue;

        const conflita = instantesOcupados.some((t) => Math.abs(t - candidatoMs) < intervaloMs);
        if (conflita) continue;

        return { agendadaPara: candidato };
      }
    }

    const proximo = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP);
    if (proximo.getTime() <= cursor.getTime()) break;
    cursor = proximo;
  }

  return null;
}

const INTERVALO_GRUPO_MS = INTERVALO_GRUPO_MIN * 60 * 1000;

/**
 * Próximo horário livre de WhatsApp/Telegram: 09:00–21:00 (Brasília),
 * 10–20 min da vizinha. Começa em `apartirDe` e preenche buraco do dia —
 * não empilha depois do último item futuro (senão o botão de enfileirar
 * pula o resto de hoje e cai amanhã).
 */
async function proximoHorarioGrupo(
  canal: Canal,
  apartirDe: Date,
  excluirPublicacaoId?: string,
): Promise<ResultadoAgenda | null> {
  const teto = Math.max(1, canal.tetoDiario === 6 ? TETO_PADRAO : canal.tetoDiario || TETO_PADRAO);
  const limite = new Date(apartirDe.getTime() + DIAS_MAXIMOS_DE_BUSCA * MS_POR_DIA);

  const ocupadas = await prisma.publicacao.findMany({
    where: {
      canalId: canal.id,
      status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
      agendadaPara: { gte: new Date(apartirDe.getTime() - MS_POR_DIA), lte: limite },
      ...(excluirPublicacaoId ? { id: { not: excluirPublicacaoId } } : {}),
    },
    select: { agendadaPara: true },
    orderBy: { agendadaPara: "asc" },
  });

  const instantesOcupados = ocupadas.map((p) => p.agendadaPara.getTime());
  const anterior = instantesOcupados.filter((t) => t <= apartirDe.getTime()).at(-1);
  const piso = Math.max(apartirDe.getTime(), anterior != null ? anterior + INTERVALO_GRUPO_MS : 0);
  const extraMin = minutosAleatoriosDoGrupo() - INTERVALO_GRUPO_MIN;

  let candidato = avancarParaJanela(new Date(piso + extraMin * 60 * 1000));

  for (let i = 0; i < MAX_ITERACOES; i++) {
    if (candidato.getTime() > limite.getTime()) return null;

    candidato = avancarParaJanela(candidato);
    const { ano, mes, dia } = partesNoFuso(candidato, FUSO_APP);
    const comecoDoDia = inicioDoDia(candidato).getTime();
    const fimDoDia = paraUtc(ano, mes, dia + 1, 0, 0, FUSO_APP).getTime();
    const jaAgendadasNoDia = instantesOcupados.filter((t) => t >= comecoDoDia && t < fimDoDia).length;

    if (jaAgendadasNoDia >= teto) {
      candidato = paraUtc(ano, mes, dia + 1, 9, 0, FUSO_APP);
      continue;
    }

    const candidatoMs = candidato.getTime();
    if (candidatoMs <= apartirDe.getTime()) {
      candidato = new Date(apartirDe.getTime() + 60_000);
      continue;
    }
    if (!estaNaJanelaDePublicacao(candidato)) {
      candidato = avancarParaJanela(new Date(candidatoMs + 60_000));
      continue;
    }

    const conflita = instantesOcupados.some((t) => Math.abs(t - candidatoMs) < INTERVALO_GRUPO_MS);
    if (conflita) {
      candidato = new Date(candidatoMs + INTERVALO_GRUPO_MS);
      continue;
    }

    return { agendadaPara: candidato };
  }

  return null;
}

let janelaPadraoAplicada = false;

/**
 * Garante a janela 09:00–21:00 a cada 10 min nos canais que ainda estão no
 * padrão antigo (90 min / teto 6). WhatsApp e Telegram ficam sempre em 10 min
 * / teto da janela — a cadência real (10–20 min) é aplicada em `proximoHorarioGrupo`.
 */
export async function aplicarJanelaPadraoNosCanais(): Promise<number> {
  let total = 0;

  if (!janelaPadraoAplicada) {
    const legado = await prisma.canal.updateMany({
      where: { OR: [{ intervaloMinimoMin: 90 }, { tetoDiario: 6 }] },
      data: { intervaloMinimoMin: INTERVALO_PADRAO_MIN, tetoDiario: TETO_PADRAO },
    });
    total += legado.count;
    janelaPadraoAplicada = true;
  }

  const grupos = await prisma.canal.updateMany({
    where: {
      rede: { in: [Rede.TELEGRAM, Rede.WHATSAPP] },
      NOT: { intervaloMinimoMin: INTERVALO_GRUPO_MIN, tetoDiario: TETO_PADRAO },
    },
    data: { intervaloMinimoMin: INTERVALO_GRUPO_MIN, tetoDiario: TETO_PADRAO },
  });
  return total + grupos.count;
}

/**
 * Move publicações PENDENTE cuja hora em Brasília está fora de 09:00–21:00
 * para o próximo slot válido. 21h BRT vira 00h UTC — isso NÃO é fora da janela;
 * 00h BRT sim, e era o que saía no Facebook de madrugada.
 */
export async function reagendarPublicacoesForaDaJanela(): Promise<number> {
  const outliers = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM publicacoes
    WHERE status = 'PENDENTE'::"StatusPublicacao"
      AND ABS(EXTRACT(EPOCH FROM ("agendadaPara" - now()))) > 120
      AND (
        EXTRACT(HOUR FROM ("agendadaPara" AT TIME ZONE 'America/Sao_Paulo')) * 60
        + EXTRACT(MINUTE FROM ("agendadaPara" AT TIME ZONE 'America/Sao_Paulo'))
      ) NOT BETWEEN 9 * 60 AND 21 * 60
  `;

  let movidas = 0;
  for (const { id } of outliers) {
    const publicacao = await prisma.publicacao.findUnique({
      where: { id },
      include: { canal: true },
    });
    if (!publicacao || publicacao.status !== "PENDENTE") continue;

    const vaga = await proximoHorarioLivre(publicacao.canal, new Date(), publicacao.id);
    if (!vaga) continue;

    await prisma.publicacao.update({
      where: { id: publicacao.id },
      data: {
        agendadaPara: vaga.agendadaPara,
        erro: "Reagendada: horário estava fora da janela 09:00–21:00 (Brasília).",
      },
    });
    movidas++;
  }

  return movidas;
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
