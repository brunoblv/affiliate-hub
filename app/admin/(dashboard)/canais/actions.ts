"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Destino, Rede } from "@/lib/database";
import { obterPublicador } from "@/lib/publicacao/publicadores";
import { gerarHorariosDaJanela, INTERVALO_PADRAO_MIN, TETO_PADRAO } from "@/lib/agenda/janela";
import { formatarLocal } from "@/lib/agenda/fuso";
import { urlPublica } from "@/lib/site-url";
import { CAPA_EDITORIAL } from "@/lib/conteudo/capa";

export interface CanalFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

function readForm(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const rede = String(formData.get("rede") ?? "") as Rede;
  const destino = String(formData.get("destino") ?? "") as Destino;
  const idExterno = String(formData.get("idExterno") ?? "").trim();
  const intervaloMinimoMin = Number(formData.get("intervaloMinimoMin") ?? INTERVALO_PADRAO_MIN);
  const tetoDiario = Number(formData.get("tetoDiario") ?? TETO_PADRAO);
  const cooldownDias = Number(formData.get("cooldownDias") ?? 30);
  const tetoOfertaIndividualDiario = Number(formData.get("tetoOfertaIndividualDiario") ?? 3);
  const linkEmComentario = formData.get("linkEmComentario") === "on";
  const ativo = formData.get("ativo") === "on";
  const intervalo = Number.isFinite(intervaloMinimoMin) && intervaloMinimoMin >= 1 ? intervaloMinimoMin : INTERVALO_PADRAO_MIN;
  const teto = Number.isFinite(tetoDiario) && tetoDiario >= 1 ? tetoDiario : TETO_PADRAO;
  const tetoOfertaIndividual = Number.isFinite(tetoOfertaIndividualDiario) && tetoOfertaIndividualDiario >= 0 ? tetoOfertaIndividualDiario : 3;

  return {
    nome,
    rede,
    destino,
    idExterno,
    horarios: gerarHorariosDaJanela(intervalo),
    intervaloMinimoMin: intervalo,
    tetoDiario: teto,
    cooldownDias,
    tetoOfertaIndividualDiario: tetoOfertaIndividual,
    linkEmComentario,
    ativo,
  };
}

export async function createCanalAction(_prev: CanalFormState, formData: FormData): Promise<CanalFormState> {
  const dados = readForm(formData);
  if (!dados.nome || !dados.idExterno) {
    return { status: "error", message: "Nome e identificador externo são obrigatórios." };
  }

  const canal = await prisma.canal.create({
    data: {
      nome: dados.nome,
      rede: dados.rede,
      destino: dados.destino,
      idExterno: dados.idExterno,
      horarios: dados.horarios,
      intervaloMinimoMin: dados.intervaloMinimoMin,
      tetoDiario: dados.tetoDiario,
      cooldownDias: dados.cooldownDias,
      tetoOfertaIndividualDiario: dados.tetoOfertaIndividualDiario,
      linkEmComentario: dados.linkEmComentario,
      ativo: dados.ativo,
    },
  });

  revalidatePath("/admin/canais");
  redirect(`/admin/canais/${canal.id}`);
}

export async function updateCanalAction(id: string, _prev: CanalFormState, formData: FormData): Promise<CanalFormState> {
  const dados = readForm(formData);
  if (!dados.nome || !dados.idExterno) {
    return { status: "error", message: "Nome e identificador externo são obrigatórios." };
  }

  await prisma.canal.update({
    where: { id },
    data: {
      nome: dados.nome,
      rede: dados.rede,
      destino: dados.destino,
      idExterno: dados.idExterno,
      horarios: dados.horarios,
      intervaloMinimoMin: dados.intervaloMinimoMin,
      tetoDiario: dados.tetoDiario,
      cooldownDias: dados.cooldownDias,
      tetoOfertaIndividualDiario: dados.tetoOfertaIndividualDiario,
      linkEmComentario: dados.linkEmComentario,
      ativo: dados.ativo,
    },
  });

  revalidatePath("/admin/canais");
  revalidatePath(`/admin/canais/${id}`);

  return { status: "success", message: "Alterações salvas." };
}

export interface ResultadoTeste {
  ok: boolean;
  mensagem: string;
}

/** Publica uma mensagem curta de teste no canal, pra confirmar que o token/chat está certo. */
export async function testarConexaoAction(id: string): Promise<ResultadoTeste> {
  const canal = await prisma.canal.findUniqueOrThrow({ where: { id } });

  try {
    const publicador = obterPublicador(canal);
    const resultado = await publicador.publicar({
      texto: `Teste de conexão do Affiliate Hub — ${formatarLocal(new Date())}`,
      link: "",
      imagemUrl: canal.rede === Rede.INSTAGRAM ? urlPublica(CAPA_EDITORIAL.src) : undefined,
    });
    return { ok: true, mensagem: `Publicado com sucesso (id externo: ${resultado.idExterno}).` };
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "Falha desconhecida." };
  }
}
