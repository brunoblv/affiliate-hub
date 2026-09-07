"use server";

import { revalidatePath } from "next/cache";
import { prisma, Categoria, Destino, Plataforma } from "@/lib/database";
import { HOME_CATEGORIAS } from "@/lib/produtos";
import { ehForaDoTemaCasa } from "@/lib/nicho";
import { DESTINOS_LISTA_OFERTA, type DestinoListaOfertaId } from "@/lib/listas-oferta/destinos";
import { validarLinkListaOferta } from "@/lib/listas-oferta/validar-link";
import { codigoCurtoLivre } from "@/lib/listas-oferta/codigo-curto";
import { enfileirarListaOferta, enfileirarListasOfertaDoDia, type ResultadoEnfileiramento } from "@/lib/agenda/enfileirar";

export interface ListaOfertaFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

const PLATAFORMAS = new Set<string>(Object.values(Plataforma));
const CATEGORIAS = new Set<string>(Object.values(Categoria));
const DESTINOS = new Set<string>(Object.values(Destino));
const REDES_IDS = new Set<string>(DESTINOS_LISTA_OFERTA.map((d) => d.id));

function lerRedes(formData: FormData): DestinoListaOfertaId[] {
  return formData
    .getAll("redes")
    .map(String)
    .filter((id): id is DestinoListaOfertaId => REDES_IDS.has(id));
}

function lerFormulario(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const plataforma = String(formData.get("plataforma") ?? "") as Plataforma;
  const categoria = String(formData.get("categoria") ?? "") as Categoria;
  const destino = String(formData.get("destino") ?? Destino.MEU_NOVO_LAR) as Destino;
  const linkAfiliado = String(formData.get("linkAfiliado") ?? "").trim();
  const redes = lerRedes(formData);
  const ativo = formData.get("ativo") === "on";
  const divulgarDiario = formData.get("divulgarDiario") === "on";

  return { titulo, plataforma, categoria, destino, linkAfiliado, redes, ativo, divulgarDiario };
}

function validarDados(dados: ReturnType<typeof lerFormulario>): string | null {
  if (!dados.titulo) return "Dê um nome para a lista (ex.: Ofertas de cozinha).";
  if (!PLATAFORMAS.has(dados.plataforma)) return "Escolha a loja.";
  if (!CATEGORIAS.has(dados.categoria)) return "Escolha a categoria.";
  if (!DESTINOS.has(dados.destino)) return "Escolha o público.";
  if (dados.redes.length === 0) {
    return "Marque pelo menos um destino: WhatsApp, Telegram, Pinterest ou página do Facebook.";
  }

  if (dados.destino === Destino.MEU_NOVO_LAR) {
    if (!HOME_CATEGORIAS.includes(dados.categoria)) {
      return "No Meu Novo Lar a categoria precisa ser de casa/lar.";
    }
    if (ehForaDoTemaCasa(dados.titulo)) {
      return "Esse título foge do nicho casa/lar.";
    }
  }

  const link = validarLinkListaOferta(dados.linkAfiliado, dados.plataforma);
  if (!link.ok) return link.erro;
  return null;
}

export async function criarListaOfertaAction(
  _prev: ListaOfertaFormState,
  formData: FormData,
): Promise<ListaOfertaFormState> {
  const dados = lerFormulario(formData);
  const erro = validarDados(dados);
  if (erro) return { status: "error", message: erro };

  const link = validarLinkListaOferta(dados.linkAfiliado, dados.plataforma);
  if (!link.ok) return { status: "error", message: link.erro };

  const lista = await prisma.listaOferta.create({
    data: {
      titulo: dados.titulo,
      plataforma: dados.plataforma,
      categoria: dados.categoria,
      destino: dados.destino,
      redes: dados.redes,
      linkAfiliado: link.url,
      codigoCurto: await codigoCurtoLivre(),
      ativo: dados.ativo,
      divulgarDiario: dados.divulgarDiario,
    },
  });

  if (dados.ativo && dados.divulgarDiario) {
    await enfileirarListaOferta(lista.id);
  }

  revalidatePath("/admin/listas-oferta");
  revalidatePath("/admin/fila");
  return { status: "success", message: "Lista cadastrada. A divulgação diária entra na fila dos destinos marcados." };
}

export async function atualizarListaOfertaAction(
  id: string,
  _prev: ListaOfertaFormState,
  formData: FormData,
): Promise<ListaOfertaFormState> {
  const dados = lerFormulario(formData);
  const erro = validarDados(dados);
  if (erro) return { status: "error", message: erro };

  const link = validarLinkListaOferta(dados.linkAfiliado, dados.plataforma);
  if (!link.ok) return { status: "error", message: link.erro };

  await prisma.listaOferta.update({
    where: { id },
    data: {
      titulo: dados.titulo,
      plataforma: dados.plataforma,
      categoria: dados.categoria,
      destino: dados.destino,
      redes: dados.redes,
      linkAfiliado: link.url,
      ativo: dados.ativo,
      divulgarDiario: dados.divulgarDiario,
    },
  });

  revalidatePath("/admin/listas-oferta");
  return { status: "success", message: "Lista atualizada." };
}

export async function excluirListaOfertaAction(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await prisma.listaOferta.delete({ where: { id } });
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Não foi possível excluir." };
  }
  revalidatePath("/admin/listas-oferta");
  revalidatePath("/admin/fila");
  return { ok: true };
}

export async function agendarListaOfertaAction(id: string): Promise<ResultadoEnfileiramento[]> {
  const resultados = await enfileirarListaOferta(id);
  revalidatePath("/admin/listas-oferta");
  revalidatePath("/admin/fila");
  return resultados;
}

export async function agendarListasOfertaDoDiaAction(): Promise<{ agendados: number }> {
  const agendados = await enfileirarListasOfertaDoDia();
  revalidatePath("/admin/listas-oferta");
  revalidatePath("/admin/fila");
  return { agendados };
}
