"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";

export async function cancelarPublicacaoAction(id: string): Promise<void> {
  await prisma.publicacao.update({ where: { id }, data: { status: "CANCELADA" } });
  revalidatePath("/admin/fila");
}

export async function republicarAction(id: string): Promise<void> {
  await prisma.publicacao.update({
    where: { id },
    data: { status: "PENDENTE", tentativas: 0, erro: null, agendadaPara: new Date() },
  });
  revalidatePath("/admin/fila");
}

export async function reagendarAction(id: string, novaData: string): Promise<void> {
  const data = new Date(novaData);
  if (Number.isNaN(data.getTime())) throw new Error("Data inválida.");

  await prisma.publicacao.update({
    where: { id },
    data: { status: "PENDENTE", agendadaPara: data, erro: null },
  });
  revalidatePath("/admin/fila");
}
