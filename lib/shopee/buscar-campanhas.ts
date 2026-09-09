import { prisma, Plataforma } from "@/lib/database";
import { registrar } from "@/lib/log";
import { buscarCampanhasShopee, type CampanhaShopee } from "./client";

export const LIMITE_RESULTADOS_CAMPANHAS = 48;

export interface CampanhaCurada extends CampanhaShopee {
  jaImportada: boolean;
}

export interface ResultadoBuscaCampanhas {
  campanhas: CampanhaCurada[];
  avaliadas: number;
  falhasBusca: number;
}

/**
 * Campanha já vira ListaOferta pelo título exato (offerName), não por id —
 * a API não devolve um id estável de campanha, só categoryId/collectionId
 * (às vezes null nos dois). offerName é o "nome da oferta" mostrado no
 * painel, suficientemente estável pra servir de chave de dedupe aqui.
 */
async function tituloDeListasOfertaJaImportadas(): Promise<Set<string>> {
  const listas = await prisma.listaOferta.findMany({
    where: { plataforma: Plataforma.SHOPEE },
    select: { titulo: true },
  });
  return new Set(listas.map((l) => l.titulo.trim().toLowerCase()));
}

/** Busca campanhas/coleções da Shopee (shopeeOfferV2) — não importa nada, só lista pra curadoria manual. */
export async function buscarCampanhasParaImportar(params: {
  keyword?: string;
  page?: number;
  limit?: number;
}): Promise<ResultadoBuscaCampanhas> {
  let campanhas: CampanhaShopee[] = [];
  let falhasBusca = 0;

  try {
    campanhas = await buscarCampanhasShopee({
      keyword: params.keyword,
      page: params.page ?? 1,
      limit: params.limit ?? LIMITE_RESULTADOS_CAMPANHAS,
    });
  } catch (erro) {
    falhasBusca++;
    await registrar("ERRO", "PRODUTO_DESCOBERTA", "Falha ao buscar campanhas da Shopee", {
      keyword: params.keyword,
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }

  const jaImportadas = await tituloDeListasOfertaJaImportadas();

  return {
    campanhas: campanhas.map((campanha) => ({
      ...campanha,
      jaImportada: jaImportadas.has(campanha.offerName.trim().toLowerCase()),
    })),
    avaliadas: campanhas.length,
    falhasBusca,
  };
}
