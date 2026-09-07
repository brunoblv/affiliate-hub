import { Rede, prisma } from "@/lib/database";
import { obterTokenDePagina, mensagemErroMeta, type ErroGraphMeta } from "@/lib/meta/credentials";
import { registrar } from "@/lib/log";

/**
 * Sincroniza Insights (regra 5 de docs/hub/regras-postagem-facebook.md) dos
 * posts já publicados no Facebook Page, pra permitir consultas como "média de
 * visualizações por content_type nos últimos 30 dias" sem análise manual.
 */

const VERSAO_GRAPH = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH = `https://graph.facebook.com/${VERSAO_GRAPH}`;

/** Não vale a pena reconsultar um post com menos de 6h desde a última sincronização. */
const INTERVALO_MINIMO_RESSINC_MS = 6 * 60 * 60 * 1000;
/** Insights de posts com mais de 60 dias já estabilizaram — para de gastar chamada. */
const JANELA_MAXIMA_DIAS = 60;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const LOTE = 25;

/**
 * Graph API v25+ (e, a partir de jun/2026, todas as versões) recusou
 * `post_impressions` / `post_impressions_unique` / `post_engaged_users`
 * com "(#100) The value must be a valid insights metric".
 * Substitutos: media view + cliques.
 */
const METRICAS =
  "post_media_view,post_total_media_view_unique,post_clicks";

interface ValorMetrica {
  name: string;
  values: Array<{ value: number | Record<string, unknown> }>;
}

interface RespostaInsights {
  data?: ValorMetrica[];
  error?: ErroGraphMeta;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

function numeroDoValor(valor: unknown): number | undefined {
  if (typeof valor === "number" && Number.isFinite(valor)) return Math.round(valor);
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    let soma = 0;
    let achou = false;
    for (const item of Object.values(valor as Record<string, unknown>)) {
      const n = numeroDoValor(item);
      if (n !== undefined) {
        soma += n;
        achou = true;
      }
    }
    return achou ? soma : undefined;
  }
  return undefined;
}

function valorDaMetrica(dados: ValorMetrica[], nome: string): number | undefined {
  return numeroDoValor(dados.find((item) => item.name === nome)?.values?.[0]?.value);
}

async function buscarInsightsDoPost(postId: string, token: string): Promise<RespostaInsights> {
  const url = new URL(`${GRAPH}/${postId}/insights`);
  url.searchParams.set("metric", METRICAS);
  url.searchParams.set("access_token", token);

  const resposta = await fetch(url);
  return (await resposta.json()) as RespostaInsights;
}

/** Sincroniza os posts pendentes de um canal Facebook Page. Retorna quantos foram atualizados. */
async function sincronizarInsightsDoCanal(canalId: string, pageId: string): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MAXIMA_DIAS * MS_POR_DIA);
  const resincronizarAntesDe = new Date(Date.now() - INTERVALO_MINIMO_RESSINC_MS);

  const pendentes = await prisma.publicacao.findMany({
    where: {
      canalId,
      status: "PUBLICADA",
      idPostExterno: { not: null },
      publicadaEm: { gte: desde },
      OR: [{ insightsSincronizadoEm: null }, { insightsSincronizadoEm: { lt: resincronizarAntesDe } }],
    },
    select: { id: true, idPostExterno: true },
    take: LOTE,
    orderBy: { publicadaEm: "desc" },
  });

  if (pendentes.length === 0) return 0;

  const token = await obterTokenDePagina(pageId);
  let atualizados = 0;

  for (const publicacao of pendentes) {
    try {
      const json = await buscarInsightsDoPost(publicacao.idPostExterno!, token);
      if (json.error) {
        throw new Error(mensagemErroMeta(json.error, "falha desconhecida"));
      }

      const dados = json.data ?? [];
      await prisma.publicacao.update({
        where: { id: publicacao.id },
        data: {
          visualizacoes: valorDaMetrica(dados, "post_media_view") ?? null,
          visualizadoresUnicos: valorDaMetrica(dados, "post_total_media_view_unique") ?? null,
          engajamentos: valorDaMetrica(dados, "post_clicks") ?? null,
          insightsSincronizadoEm: new Date(),
        },
      });
      atualizados++;
    } catch (erro) {
      await registrar("ERRO", "INSIGHTS", `Falha ao sincronizar Insights de ${publicacao.idPostExterno}`, {
        publicacaoId: publicacao.id,
        erro: mensagemErro(erro),
      });
      // Marca como sincronizado mesmo em erro pra não martelar o mesmo post a cada tick.
      await prisma.publicacao.update({
        where: { id: publicacao.id },
        data: { insightsSincronizadoEm: new Date() },
      });
    }
  }

  return atualizados;
}

/** Roda a sincronização em todos os canais FACEBOOK_PAGE ativos. */
export async function sincronizarInsightsFacebook(): Promise<number> {
  const canais = await prisma.canal.findMany({ where: { ativo: true, rede: Rede.FACEBOOK_PAGE } });

  let total = 0;
  for (const canal of canais) {
    try {
      total += await sincronizarInsightsDoCanal(canal.id, canal.idExterno);
    } catch (erro) {
      await registrar("ERRO", "INSIGHTS", `Falha ao sincronizar Insights do canal ${canal.nome}`, {
        canal: canal.nome,
        erro: mensagemErro(erro),
      });
    }
  }
  return total;
}
