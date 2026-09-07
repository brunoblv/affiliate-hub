"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, StatusPublicacao } from "@/lib/database";
import { deInputDatetimeLocal } from "@/lib/agenda/fuso";
import { executarPublicacao } from "@/lib/publicacao/executar";
import { reorganizarFilaDoGrupo } from "@/lib/agenda/reorganizar-grupo";

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

export async function publicarAgoraAction(id: string): Promise<{ publicada: boolean; erro?: string }> {
  try {
    const reivindicada = await prisma.publicacao.updateMany({
      where: { id, status: StatusPublicacao.PENDENTE },
      data: {
        status: StatusPublicacao.PUBLICANDO,
        tentativas: { increment: 1 },
        agendadaPara: new Date(),
      },
    });

    if (reivindicada.count === 0) {
      return { publicada: false, erro: "Só é possível publicar agora uma publicação pendente." };
    }

    await executarPublicacao(id);

    const resultado = await prisma.publicacao.findUnique({ where: { id }, select: { status: true, erro: true } });
    revalidatePath("/admin/fila");

    if (resultado?.status === StatusPublicacao.PUBLICADA) {
      return { publicada: true };
    }

    return {
      publicada: false,
      erro: resultado?.erro ?? "Não foi possível publicar agora.",
    };
  } catch (erro) {
    revalidatePath("/admin/fila");
    falhou(erro, "Não foi possível publicar agora.");
  }
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
  let data: Date;
  try {
    data = deInputDatetimeLocal(novaData);
  } catch {
    throw new Error("Data inválida. Use AAAA-MM-DDTHH:mm no horário de Brasília.");
  }

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

export async function reorganizarFilaDoGrupoAction(
  canalId: string,
): Promise<{ ok: true; canal: string; movidas: number; pendentes: number } | { ok: false; message: string }> {
  const sessao = await auth();
  if (!sessao) return { ok: false, message: "Não autorizado." };

  const id = canalId.trim();
  if (!id) return { ok: false, message: "Escolha o grupo do WhatsApp para reorganizar." };

  try {
    const resultado = await reorganizarFilaDoGrupo(id);
    revalidatePath("/admin/fila");
    return {
      ok: true,
      canal: resultado.canal,
      movidas: resultado.movidas,
      pendentes: resultado.pendentes,
    };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Não foi possível reorganizar a fila." };
  }
}
