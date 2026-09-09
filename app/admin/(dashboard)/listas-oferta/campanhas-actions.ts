"use server";

import { revalidatePath } from "next/cache";
import { prisma, Categoria, Destino, Plataforma } from "@/lib/database";
import { HOME_CATEGORIAS } from "@/lib/produtos";
import { ehForaDoTemaCasa } from "@/lib/nicho";
import { DESTINOS_LISTA_OFERTA, type DestinoListaOfertaId } from "@/lib/listas-oferta/destinos";
import { validarLinkListaOferta } from "@/lib/listas-oferta/validar-link";
import { codigoCurtoLivre } from "@/lib/listas-oferta/codigo-curto";
import { buscarCampanhasParaImportar, type CampanhaCurada } from "@/lib/shopee/buscar-campanhas";
import { enfileirarListaOferta } from "@/lib/agenda/enfileirar";

export interface BuscaCampanhasState {
  status: "idle" | "error" | "success";
  message?: string;
  campanhas?: CampanhaCurada[];
}

/** Busca campanhas gerais da Shopee (shopeeOfferV2) pra curadoria manual — não importa nada. */
export async function buscarCampanhasAction(
  _prev: BuscaCampanhasState,
  formData: FormData,
): Promise<BuscaCampanhasState> {
  const keyword = String(formData.get("keyword") ?? "").trim();

  const resultado = await buscarCampanhasParaImportar({ keyword: keyword || undefined });
  if (resultado.falhasBusca > 0 && resultado.campanhas.length === 0) {
    return { status: "error", message: "Falha ao buscar campanhas na Shopee. Tente de novo em alguns minutos." };
  }
  if (resultado.campanhas.length === 0) {
    return { status: "success", message: "Nenhuma campanha encontrada.", campanhas: [] };
  }
  return {
    status: "success",
    message: `${resultado.campanhas.length} campanha(s) encontrada(s).`,
    campanhas: resultado.campanhas,
  };
}

const LIMITE_IMPORT_CAMPANHAS = 20;

export interface ResultadoImportCampanhas {
  ok: boolean;
  message?: string;
  importadas: number;
  jaExistiam: number;
  erros: number;
}

/**
 * Cria uma ListaOferta por campanha selecionada, com destino/categoria/redes
 * escolhidos uma vez pro lote inteiro (a maioria das campanhas de um mesmo
 * lote costuma ser do mesmo público — se não for, importe em lotes separados).
 */
export async function importarCampanhasEmLoteAction(params: {
  campanhas: CampanhaCurada[];
  destino: Destino;
  categoria: Categoria;
  redes: DestinoListaOfertaId[];
  divulgarDiario: boolean;
}): Promise<ResultadoImportCampanhas> {
  if (!Array.isArray(params.campanhas) || params.campanhas.length === 0) {
    return { ok: false, message: "Nenhuma campanha selecionada.", importadas: 0, jaExistiam: 0, erros: 0 };
  }
  if (params.campanhas.length > LIMITE_IMPORT_CAMPANHAS) {
    return {
      ok: false,
      message: `Selecione no máximo ${LIMITE_IMPORT_CAMPANHAS} campanhas por vez.`,
      importadas: 0,
      jaExistiam: 0,
      erros: 0,
    };
  }
  if (!Object.values(Destino).includes(params.destino)) {
    return { ok: false, message: "Destino inválido.", importadas: 0, jaExistiam: 0, erros: 0 };
  }
  if (!Object.values(Categoria).includes(params.categoria)) {
    return { ok: false, message: "Categoria inválida.", importadas: 0, jaExistiam: 0, erros: 0 };
  }
  if (params.destino === Destino.MEU_NOVO_LAR && !HOME_CATEGORIAS.includes(params.categoria)) {
    return {
      ok: false,
      message: "No Meu Novo Lar a categoria precisa ser de casa/lar.",
      importadas: 0,
      jaExistiam: 0,
      erros: 0,
    };
  }
  const idsRedesValidos = new Set(DESTINOS_LISTA_OFERTA.map((d) => d.id));
  const redes = params.redes.filter((id) => idsRedesValidos.has(id));
  if (redes.length === 0) {
    return {
      ok: false,
      message: "Marque pelo menos um destino: WhatsApp, Telegram, Pinterest ou página do Facebook.",
      importadas: 0,
      jaExistiam: 0,
      erros: 0,
    };
  }

  let importadas = 0;
  let jaExistiam = 0;
  let erros = 0;
  const criadas: string[] = [];

  for (const campanha of params.campanhas) {
    try {
      if (params.destino === Destino.MEU_NOVO_LAR && ehForaDoTemaCasa(campanha.offerName)) {
        erros++;
        continue;
      }

      const link = validarLinkListaOferta(campanha.offerLink, Plataforma.SHOPEE);
      if (!link.ok) {
        erros++;
        continue;
      }

      const existente = await prisma.listaOferta.findFirst({
        where: { plataforma: Plataforma.SHOPEE, titulo: { equals: campanha.offerName, mode: "insensitive" } },
        select: { id: true },
      });
      if (existente) {
        jaExistiam++;
        continue;
      }

      const lista = await prisma.listaOferta.create({
        data: {
          titulo: campanha.offerName,
          plataforma: Plataforma.SHOPEE,
          categoria: params.categoria,
          destino: params.destino,
          redes,
          linkAfiliado: link.url,
          codigoCurto: await codigoCurtoLivre(),
          ativo: true,
          divulgarDiario: params.divulgarDiario,
        },
      });
      importadas++;
      criadas.push(lista.id);
    } catch {
      erros++;
    }
  }

  if (params.divulgarDiario) {
    for (const id of criadas) {
      try {
        await enfileirarListaOferta(id);
      } catch {
        // Falha ao agendar não desfaz a importação — a lista ainda entra no ciclo diário normal.
      }
    }
  }

  revalidatePath("/admin/listas-oferta");
  revalidatePath("/admin/fila");

  return { ok: true, importadas, jaExistiam, erros };
}
