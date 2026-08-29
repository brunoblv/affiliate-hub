"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";

export interface NotaJornadaFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

export async function criarNotaJornadaAction(
  _prev: NotaJornadaFormState,
  formData: FormData,
): Promise<NotaJornadaFormState> {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { status: "error", message: "Escreva alguma coisa antes de adicionar." };

  await prisma.notaJornada.create({ data: { texto } });

  revalidatePath("/admin/jornada");
  return { status: "success", message: "Bloco adicionado." };
}

export async function excluirNotaJornadaAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await prisma.notaJornada.delete({ where: { id } });
    revalidatePath("/admin/jornada");
    return { ok: true };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Não foi possível excluir." };
  }
}
