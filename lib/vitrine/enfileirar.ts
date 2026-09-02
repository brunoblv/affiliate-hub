import { prisma, type Canal, type LandingDiaria } from "@/lib/database";
import { proximoHorarioLivre } from "@/lib/agenda/proximo-horario";
import { gerarLegendaDaLanding } from "@/lib/conteudo/gerar-legenda";
import { registrar } from "@/lib/log";
import { getSiteUrl, urlPublica } from "@/lib/site-url";
import { primeiraImagem } from "@/lib/produtos";
import type { ResultadoEnfileiramento } from "@/lib/agenda/enfileirar";
import { LABEL_DESTINO } from "./destinos";
import { gerarImagemDePublicacao } from "@/lib/artes";
import { reais } from "./rotulos";

const ORIGEM_POR_REDE: Record<Canal["rede"], string> = {
  FACEBOOK_PAGE: "facebook",
  FACEBOOK_GROUP: "facebook-grupo",
  INSTAGRAM: "instagram",
  TELEGRAM: "telegram",
  WHATSAPP: "whatsapp",
};

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

function isViolacaoIdempotencia(erro: unknown): boolean {
  if (!erro || typeof erro !== "object") return false;
  const code = "code" in erro ? String(erro.code) : "";
  const message = mensagemErro(erro);
  const target =
    "meta" in erro && erro.meta && typeof erro.meta === "object" && "target" in erro.meta
      ? String(erro.meta.target)
      : "";
  return code === "P2002" || message.includes("chaveIdempotencia") || target.includes("chaveIdempotencia");
}

function pulado(canalId: string, canal: string, motivoPulado: string): ResultadoEnfileiramento {
  return { canalId, canal, motivoPulado };
}

/**
 * Agenda 1 post de divulgação da landing em cada canal ativo do destino.
 * Não cria um post por produto — o link aponta para a página da vitrine.
 */
export async function enfileirarDivulgacaoDaLanding(
  landingId: string,
  canalIds?: string[],
): Promise<ResultadoEnfileiramento[]> {
  const landing = await prisma.landingDiaria.findUnique({
    where: { id: landingId },
    include: {
      heroProduto: { select: { nome: true, imagens: true, linkAfiliado: true, precoAtual: true, precoOriginal: true } },
    },
  });

  if (!landing) {
    return [pulado(landingId, "Landing", "Landing não encontrada.")];
  }

  if (landing.status !== "PUBLICADA") {
    return [pulado(landing.id, landing.slug, "Landing ainda não está publicada.")];
  }

  const canais = await prisma.canal.findMany({
    where: {
      ativo: true,
      destino: landing.destino,
      ...(canalIds?.length ? { id: { in: canalIds } } : {}),
    },
  });

  if (canais.length === 0) {
    const destino = LABEL_DESTINO[landing.destino] ?? landing.destino;
    return [
      pulado(
        landing.destino,
        "Nenhum canal",
        `Nenhum canal ativo para o destino ${destino}. Cadastre ou ative um canal com o mesmo destino.`,
      ),
    ];
  }

  const imagemUrl = await imagemDaOferta(landing);

  const resultados: ResultadoEnfileiramento[] = [];
  for (const canal of canais) {
    try {
      resultados.push(await enfileirarNoCanal(canal, landing, imagemUrl));
    } catch (erro) {
      resultados.push(pulado(canal.id, canal.nome, mensagemErro(erro)));
    }
  }

  return resultados;
}

type HeroDaLanding = {
  nome: string;
  imagens: unknown;
  linkAfiliado: string;
  precoAtual: unknown;
  precoOriginal: unknown;
} | null;

/**
 * Compõe a arte quadrada da oferta (fundo + foto do hero + título + de/por).
 * Cai de volta para a foto crua do hero se o fundo do tipo "oferta" ainda
 * não existir ou se a composição falhar.
 */
async function imagemDaOferta(landing: LandingDiaria & { heroProduto: HeroDaLanding }): Promise<string | null> {
  const hero = landing.heroProduto;
  const fotoCrua = hero ? (primeiraImagem({ imagens: hero.imagens as never }) ?? null) : null;
  if (!hero) return fotoCrua;

  try {
    const precoAtual = reais(hero.precoAtual);
    const temDesconto = hero.precoOriginal && Number(hero.precoOriginal) > Number(hero.precoAtual);
    const precoOriginal = temDesconto ? reais(hero.precoOriginal) : null;
    const selo = temDesconto
      ? `-${Math.round((1 - Number(hero.precoAtual) / Number(hero.precoOriginal)) * 100)}% hoje`
      : "Ofertas do dia";

    const url = await gerarImagemDePublicacao({
      tipo: "oferta",
      semente: landing.id,
      titulo: landing.headline?.trim() || hero.nome,
      fotoUrl: fotoCrua,
      precoAtual,
      precoOriginal,
      selo,
    });
    if (url) return urlPublica(url) ?? null;
  } catch (erro) {
    await registrar("ERRO", "ARTES", "Falha ao compor arte da oferta — publicando com a foto crua.", {
      slug: landing.slug,
      erro: mensagemErro(erro),
    });
  }
  return fotoCrua;
}

async function enfileirarNoCanal(
  canal: Canal,
  landing: LandingDiaria & { heroProduto: HeroDaLanding },
  imagemUrl: string | null,
): Promise<ResultadoEnfileiramento> {
  const base: ResultadoEnfileiramento = { canalId: canal.id, canal: canal.nome };

  const jaAgendado = await prisma.publicacao.findFirst({
    where: {
      canalId: canal.id,
      landingDiariaId: landing.id,
      status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
    },
    select: { id: true },
  });
  if (jaAgendado) {
    return { ...base, motivoPulado: "Essa landing já foi agendada/publicada neste canal." };
  }

  const siteUrl = getSiteUrl();
  const link = `${siteUrl}/vitrine/${landing.slug}?utm_source=${ORIGEM_POR_REDE[canal.rede]}&utm_medium=social`;

  let vaga;
  try {
    vaga = await proximoHorarioLivre(canal);
  } catch (erro) {
    return { ...base, motivoPulado: mensagemErro(erro) };
  }

  if (!vaga) {
    const pendentes = await prisma.publicacao.count({
      where: { canalId: canal.id, status: { in: ["PENDENTE", "PUBLICANDO"] } },
    });
    return {
      ...base,
      motivoPulado: `Sem horário livre (teto ${canal.tetoDiario}/dia, intervalo ${canal.intervaloMinimoMin} min, ${pendentes} na fila). Aumente o teto do canal.`,
    };
  }

  const headline = landing.headline?.trim() || `Ofertas do dia — ${LABEL_DESTINO[landing.destino]}`;
  const texto = await gerarLegendaDaLanding({
    headline,
    resumo: landing.metaDescricao,
    destino: landing.destino,
    rede: canal.rede,
    link,
  });

  const chaveIdempotencia = `${landing.id}:${canal.id}:${vaga.agendadaPara.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        landingDiariaId: landing.id,
        canalId: canal.id,
        agendadaPara: vaga.agendadaPara,
        texto,
        imagemUrl,
        linkDestino: link,
        chaveIdempotencia,
      },
    });

    await registrar("INFO", "AGENDA", `Landing agendada em ${canal.nome}`, {
      slug: landing.slug,
      destino: landing.destino,
      agendadaPara: vaga.agendadaPara.toISOString(),
    });

    return { ...base, agendadaPara: vaga.agendadaPara.toISOString(), publicacaoId: publicacao.id };
  } catch (erro) {
    if (isViolacaoIdempotencia(erro)) {
      return { ...base, motivoPulado: "Slot já reservado por outro agendamento" };
    }
    throw erro;
  }
}

export type { ResultadoEnfileiramento };
