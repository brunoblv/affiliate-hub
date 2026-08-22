"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Destino, Rede } from "@/lib/database";
import { obterPublicador } from "@/lib/publicacao/publicadores";
import { HORARIOS_PADRAO } from "@/lib/agenda/proximo-horario";

export interface CanalFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

function parseHorarios(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((h) => h.trim())
    .filter(Boolean);
}

function readForm(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const rede = String(formData.get("rede") ?? "") as Rede;
  const destino = String(formData.get("destino") ?? "") as Destino;
  const idExterno = String(formData.get("idExterno") ?? "").trim();
  const horarios = parseHorarios(String(formData.get("horarios") ?? ""));
  const intervaloMinimoMin = Number(formData.get("intervaloMinimoMin") ?? 90);
  const tetoDiario = Number(formData.get("tetoDiario") ?? 6);
  const cooldownDias = Number(formData.get("cooldownDias") ?? 30);
  const ativo = formData.get("ativo") === "on";

  return { nome, rede, destino, idExterno, horarios, intervaloMinimoMin, tetoDiario, cooldownDias, ativo };
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
      horarios: dados.horarios.length > 0 ? dados.horarios : HORARIOS_PADRAO,
      intervaloMinimoMin: dados.intervaloMinimoMin,
      tetoDiario: dados.tetoDiario,
      cooldownDias: dados.cooldownDias,
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
      horarios: dados.horarios.length > 0 ? dados.horarios : HORARIOS_PADRAO,
      intervaloMinimoMin: dados.intervaloMinimoMin,
      tetoDiario: dados.tetoDiario,
      cooldownDias: dados.cooldownDias,
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
      texto: `Teste de conexão do Affiliate Hub — ${new Date().toLocaleString("pt-BR")}`,
      link: "",
    });
    return { ok: true, mensagem: `Publicado com sucesso (id externo: ${resultado.idExterno}).` };
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "Falha desconhecida." };
  }
}
