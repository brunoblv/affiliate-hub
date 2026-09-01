import { prisma, Destino, StatusLanding } from "@/lib/database";
import { registrar } from "@/lib/log";
import { obterConfiguracaoVitrine, destinosEmModoVitrine } from "./configuracao";
import { curarProdutosDoDia } from "./curadoria";
import { gerarTextosDaLanding } from "./textos";
import { dataCivil, slugDaLanding } from "./data";
import { PREFIXO_SLUG, LABEL_DESTINO } from "./destinos";
import { enfileirarDivulgacaoDaLanding, type ResultadoEnfileiramento } from "./enfileirar";

export interface ResultadoGeracaoLanding {
  destino: Destino;
  status: "publicada" | "pulada" | "falhou";
  slug?: string;
  landingId?: string;
  quantidadeItens?: number;
  textosViaGemini?: boolean;
  divulgacao?: ResultadoEnfileiramento[];
  motivo?: string;
}

function ehViolacaoUnica(erro: unknown): boolean {
  if (!erro || typeof erro !== "object" || !("code" in erro)) return false;
  return erro.code === "P2002";
}

/**
 * Gera (ou reusa) a landing do dia para um destino em modo Vitrine.
 * Idempotente: se já existe PUBLICADA no mesmo dia, não duplica — a menos de `forcar`.
 */
export async function gerarLandingDoDestino(
  destino: Destino,
  opcoes?: { forcar?: boolean },
): Promise<ResultadoGeracaoLanding> {
  const forcar = opcoes?.forcar ?? false;
  const data = dataCivil();
  const slug = slugDaLanding(PREFIXO_SLUG[destino], data);

  const existente = await prisma.landingDiaria.findUnique({
    where: { destino_data: { destino, data } },
  });

  if (existente?.status === StatusLanding.PUBLICADA && !forcar) {
    return {
      destino,
      status: "pulada",
      slug: existente.slug,
      landingId: existente.id,
      motivo: "Landing do dia já publicada.",
    };
  }

  const config = await obterConfiguracaoVitrine(destino);
  const itens = await curarProdutosDoDia(destino, config);

  if (itens.length === 0) {
    const landing = await gravarFalha(existente?.id, destino, data, slug, "Nenhum produto elegível para a vitrine.");
    await registrar("ERRO", "VITRINE", `Curadoria vazia em ${LABEL_DESTINO[destino]}`, { destino, slug });
    return { destino, status: "falhou", slug, landingId: landing.id, motivo: "Nenhum produto elegível para a vitrine." };
  }

  const textos = await gerarTextosDaLanding(destino, data, itens);
  const hero = itens.find((i) => i.hero) ?? itens[0];

  let landingId = existente?.id;

  try {
    if (landingId) {
      await prisma.landingProduto.deleteMany({ where: { landingDiariaId: landingId } });
      await prisma.landingDiaria.update({
        where: { id: landingId },
        data: {
          slug,
          heroProdutoId: hero.produto.id,
          headline: textos.headline,
          metaTitulo: textos.metaTitulo,
          metaDescricao: textos.metaDescricao,
          status: StatusLanding.PUBLICADA,
          textosViaGemini: textos.viaGemini,
          geradaEm: new Date(),
        },
      });
    } else {
      const criada = await prisma.landingDiaria.create({
        data: {
          destino,
          data,
          slug,
          heroProdutoId: hero.produto.id,
          headline: textos.headline,
          metaTitulo: textos.metaTitulo,
          metaDescricao: textos.metaDescricao,
          status: StatusLanding.PUBLICADA,
          textosViaGemini: textos.viaGemini,
        },
      });
      landingId = criada.id;
    }
  } catch (erro) {
    if (ehViolacaoUnica(erro) && !forcar) {
      const outra = await prisma.landingDiaria.findUnique({ where: { destino_data: { destino, data } } });
      if (outra?.status === StatusLanding.PUBLICADA) {
        return {
          destino,
          status: "pulada",
          slug: outra.slug,
          landingId: outra.id,
          motivo: "Landing do dia já publicada (corrida entre jobs).",
        };
      }
      throw erro;
    }
    throw erro;
  }

  await prisma.landingProduto.createMany({
    data: itens.map((item, posicao) => {
      const texto = textos.itens[item.produto.id];
      return {
        landingDiariaId: landingId!,
        produtoId: item.produto.id,
        posicao,
        faixaPreco: item.faixa,
        selo: item.selo,
        tituloCurto: texto?.tituloCurto ?? null,
        descricao: texto?.descricao ?? null,
      };
    }),
  });

  const divulgacao = await enfileirarDivulgacaoDaLanding(landingId);

  await registrar("INFO", "VITRINE", `Landing publicada: ${slug}`, {
    destino,
    itens: itens.length,
    viaGemini: textos.viaGemini,
    divulgacao: divulgacao.filter((r) => r.publicacaoId).length,
  });

  return {
    destino,
    status: "publicada",
    slug,
    landingId,
    quantidadeItens: itens.length,
    textosViaGemini: textos.viaGemini,
    divulgacao,
  };
}

async function gravarFalha(
  id: string | undefined,
  destino: Destino,
  data: Date,
  slug: string,
  motivo: string,
) {
  const dados = {
    slug,
    headline: null as string | null,
    metaTitulo: `Ofertas — ${LABEL_DESTINO[destino]}`,
    metaDescricao: motivo,
    status: StatusLanding.FALHOU,
    textosViaGemini: false,
    geradaEm: new Date(),
  };

  if (id) {
    return prisma.landingDiaria.update({ where: { id }, data: dados });
  }

  try {
    return await prisma.landingDiaria.create({
      data: { destino, data, ...dados },
    });
  } catch (erro) {
    if (ehViolacaoUnica(erro)) {
      const outra = await prisma.landingDiaria.findUniqueOrThrow({ where: { destino_data: { destino, data } } });
      return prisma.landingDiaria.update({ where: { id: outra.id }, data: dados });
    }
    throw erro;
  }
}

/** Job diário: gera a landing de cada destino em modo Vitrine. */
export async function gerarLandingsDoDia(): Promise<ResultadoGeracaoLanding[]> {
  const destinos = await destinosEmModoVitrine();
  if (destinos.length === 0) return [];

  const resultados: ResultadoGeracaoLanding[] = [];
  for (const destino of destinos) {
    try {
      resultados.push(await gerarLandingDoDestino(destino));
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      await registrar("ERRO", "VITRINE", `Geração falhou em ${LABEL_DESTINO[destino]}`, { destino, erro: motivo });
      resultados.push({ destino, status: "falhou", motivo });
    }
  }
  return resultados;
}
