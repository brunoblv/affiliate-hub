"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, StatusPublicacao } from "@/lib/database";

function falhou(erro: unknown, fallback: string): never {
  throw new Error(erro instanceof Error ? erro.message : fallback);
}

export async function cancelarPublicacaoAction(id: string): Promise<void> {
  try {
    await prisma.publicacao.update({ where: { id }, data: { status: "CANCELADA" } });
  } catch (erro) {
    falhou(erro, "Não foi possível cancelar a publicação.");
  }
  revalidatePath("/admin/fila");
}

export async function publicarAgoraAction(id: string): Promise<void> {
  try {
    await prisma.publicacao.update({
      where: { id, status: "PENDENTE" },
      data: { agendadaPara: new Date() },
    });
  } catch (erro) {
    falhou(erro, "Não foi possível publicar agora.");
  }
  revalidatePath("/admin/fila");
}

export async function republicarAction(id: string): Promise<void> {
  try {
    await prisma.publicacao.update({
      where: { id },
      data: { status: "PENDENTE", tentativas: 0, erro: null, agendadaPara: new Date() },
    });
  } catch (erro) {
    falhou(erro, "Não foi possível republicar.");
  }
  revalidatePath("/admin/fila");
}

export async function reagendarAction(id: string, novaData: string): Promise<void> {
  const data = new Date(novaData);
  if (Number.isNaN(data.getTime())) throw new Error("Data inválida.");

  try {
    await prisma.publicacao.update({
      where: { id },
      data: { status: "PENDENTE", agendadaPara: data, erro: null },
    });
  } catch (erro) {
    falhou(erro, "Não foi possível reagendar.");
  }
  revalidatePath("/admin/fila");
}

export async function limparFilaAction(): Promise<
  { ok: true; count: number; emPublicacao: number } | { ok: false; message: string }
> {
  const sessao = await auth();
  if (!sessao) return { ok: false, message: "Não autorizado." };

  try {
    const emPublicacao = await prisma.publicacao.count({
      where: { status: StatusPublicacao.PUBLICANDO },
    });
    const { count } = await prisma.publicacao.deleteMany({
      where: { status: { not: StatusPublicacao.PUBLICANDO } },
    });
    revalidatePath("/admin/fila");
    return { ok: true, count, emPublicacao };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Não foi possível limpar a fila." };
  }
}
