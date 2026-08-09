"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { BlocklistType } from "@/lib/generated/prisma/client";

export async function createBlocklistEntryAction(formData: FormData) {
  const type = String(formData.get("type") ?? "") as BlocklistType;
  if (!Object.values(BlocklistType).includes(type)) throw new Error("Tipo inválido.");

  const value = String(formData.get("value") ?? "").trim();
  if (!value) throw new Error("Valor é obrigatório.");

  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  await prisma.blocklist.upsert({
    where: { type_value: { type, value } },
    create: { type, value, notes },
    update: { active: true, notes },
  });

  revalidatePath("/admin/automacao/bloqueios");
}

export async function toggleBlocklistEntryAction(entryId: string) {
  const entry = await prisma.blocklist.findUniqueOrThrow({ where: { id: entryId } });
  await prisma.blocklist.update({ where: { id: entryId }, data: { active: !entry.active } });
  revalidatePath("/admin/automacao/bloqueios");
}
