import { ContentType, Rede, prisma } from "@/lib/database";
import { registrar } from "@/lib/log";

/** Regra 3 de docs/hub/regras-postagem-facebook.md: mínimo por semana. */
export const MINIMO_NARRATIVA_PESSOAL_SEMANA = 1;
export const MINIMO_SELECAO_SEMANA = 2;

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_JANELA = 7;

export interface MixSemanal {
  ofertaIndividual: number;
  selecao: number;
  conteudoBlog: number;
  narrativaPessoal: number;
}

const STATUS_CONTABILIZADOS = ["PENDENTE", "PUBLICANDO", "PUBLICADA"] as const;

/** Conta publicações por content_type nos últimos 7 dias (agendadas ou já publicadas) para um canal. */
export async function calcularMixSemanal(canalId: string, referencia: Date = new Date()): Promise<MixSemanal> {
  const desde = new Date(referencia.getTime() - DIAS_JANELA * MS_POR_DIA);

  const contagens = await prisma.publicacao.groupBy({
    by: ["contentType"],
    where: {
      canalId,
      status: { in: [...STATUS_CONTABILIZADOS] },
      agendadaPara: { gte: desde, lte: referencia },
    },
    _count: { _all: true },
  });

  const mix: MixSemanal = { ofertaIndividual: 0, selecao: 0, conteudoBlog: 0, narrativaPessoal: 0 };
  for (const linha of contagens) {
    const total = linha._count._all;
    switch (linha.contentType) {
      case ContentType.OFERTA_INDIVIDUAL:
        mix.ofertaIndividual = total;
        break;
      case ContentType.SELECAO:
        mix.selecao = total;
        break;
      case ContentType.CONTEUDO_BLOG:
        mix.conteudoBlog = total;
        break;
      case ContentType.NARRATIVA_PESSOAL:
        mix.narrativaPessoal = total;
        break;
    }
  }
  return mix;
}

/**
 * Loga um ALERTA se o mix da semana (últimos 7 dias) do canal está abaixo do
 * previsto na regra 3 — em vez de deixar a fila se encher de oferta_individual
 * em silêncio. Só se aplica a canais do Facebook Page.
 */
export async function alertarMixSemanalSeNecessario(canal: { id: string; nome: string; rede: Rede }): Promise<MixSemanal | null> {
  if (canal.rede !== Rede.FACEBOOK_PAGE) return null;

  const mix = await calcularMixSemanal(canal.id);
  const faltaNarrativa = mix.narrativaPessoal < MINIMO_NARRATIVA_PESSOAL_SEMANA;
  const faltaSelecao = mix.selecao < MINIMO_SELECAO_SEMANA;

  if (faltaNarrativa || faltaSelecao) {
    await registrar(
      "ALERTA",
      "AGENDA",
      `Mix semanal do Facebook abaixo do previsto em "${canal.nome}" — faltam ${
        faltaNarrativa ? `narrativa_pessoal (${mix.narrativaPessoal}/${MINIMO_NARRATIVA_PESSOAL_SEMANA})` : ""
      }${faltaNarrativa && faltaSelecao ? " e " : ""}${
        faltaSelecao ? `selecao (${mix.selecao}/${MINIMO_SELECAO_SEMANA})` : ""
      }. Publique conteúdo desses tipos em vez de mais oferta_individual.`,
      { canal: canal.nome, ...mix },
    );
  }

  return mix;
}
