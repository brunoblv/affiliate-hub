import { Rede, prisma } from "@/lib/database";
import { registrar } from "@/lib/log";
import { calcularMixSemanal, MINIMO_NARRATIVA_PESSOAL_SEMANA, MINIMO_SELECAO_SEMANA } from "@/lib/agenda/mix-semanal";
import { mediaPorContentType, type MediaPorContentType } from "./media-por-content-type";

/**
 * Regra 6 de docs/hub/regras-postagem-facebook.md: resumo semanal por
 * página/canal — quantos posts por content_type e média de
 * visualizações/engajamento de cada um, sinalizando se `oferta_individual`
 * ficou acima do previsto na regra 3.
 */
export interface RelatorioSemanalCanal {
  canalId: string;
  canal: string;
  totalPosts: number;
  proporcaoOfertaIndividual: number;
  mixAbaixoDoEsperado: boolean;
  metricas: MediaPorContentType[];
}

export async function gerarRelatorioSemanalCanal(canal: { id: string; nome: string }): Promise<RelatorioSemanalCanal> {
  const mix = await calcularMixSemanal(canal.id);
  const totalPosts = mix.ofertaIndividual + mix.selecao + mix.conteudoBlog + mix.narrativaPessoal;
  const proporcaoOfertaIndividual = totalPosts === 0 ? 0 : mix.ofertaIndividual / totalPosts;
  const mixAbaixoDoEsperado =
    mix.narrativaPessoal < MINIMO_NARRATIVA_PESSOAL_SEMANA || mix.selecao < MINIMO_SELECAO_SEMANA;

  const metricas = await mediaPorContentType(canal.id, 30);

  return {
    canalId: canal.id,
    canal: canal.nome,
    totalPosts,
    proporcaoOfertaIndividual,
    mixAbaixoDoEsperado,
    metricas,
  };
}

/** Roda o relatório em todos os canais FACEBOOK_PAGE ativos e registra o resumo (ALERTA se o mix está abaixo do previsto). */
export async function executarRelatorioSemanalFacebook(): Promise<RelatorioSemanalCanal[]> {
  const canais = await prisma.canal.findMany({ where: { ativo: true, rede: Rede.FACEBOOK_PAGE } });

  const relatorios: RelatorioSemanalCanal[] = [];
  for (const canal of canais) {
    const relatorio = await gerarRelatorioSemanalCanal(canal);
    relatorios.push(relatorio);

    await registrar(
      relatorio.mixAbaixoDoEsperado ? "ALERTA" : "INFO",
      "RELATORIO_SEMANAL",
      `Relatório semanal do Facebook — ${relatorio.canal}: ${relatorio.totalPosts} post(s), ` +
        `${Math.round(relatorio.proporcaoOfertaIndividual * 100)}% oferta_individual` +
        (relatorio.mixAbaixoDoEsperado ? " (mix abaixo do previsto na regra 3)" : ""),
      { canal: relatorio.canal, metricas: relatorio.metricas },
    );
  }

  return relatorios;
}
