"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { Channel, ProjectChannelType } from "@/lib/generated/prisma/client";

export async function createProjectChannelAction(projectSlug: string, formData: FormData) {
  const project = await getProjectBySlug(projectSlug);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const platform = String(formData.get("platform") ?? "") as Channel;
  if (!Object.values(Channel).includes(platform)) throw new Error("Plataforma inválida.");

  const type = String(formData.get("type") ?? "") as ProjectChannelType;
  if (!Object.values(ProjectChannelType).includes(type)) throw new Error("Tipo de canal inválido.");

  // Grupos privados não são automatizados (docs/modulo-afiliados-umbanda.md §Grupos públicos).
  if (type === ProjectChannelType.PRIVATE_GROUP) {
    throw new Error("Grupos privados não podem ser cadastrados como canal de automação.");
  }

  const url = String(formData.get("url") ?? "").trim() || undefined;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const externalPageId = String(formData.get("externalPageId") ?? "").trim() || undefined;
  const externalChatId = String(formData.get("externalChatId") ?? "").trim() || undefined;
  const cooldownDays = Number(formData.get("cooldownDays") ?? 7) || 7;
  const allowLinks = formData.get("allowLinks") === "on";
  const allowOffers = formData.get("allowOffers") === "on";

  await prisma.projectChannel.create({
    data: {
      projectId: project.id,
      name,
      platform,
      type,
      url,
      notes,
      externalPageId,
      externalChatId,
      cooldownDays,
      allowLinks,
      allowOffers,
    },
  });

  revalidatePath(`/admin/afiliados/${projectSlug}/canais`);
}

export async function toggleProjectChannelAction(projectSlug: string, channelId: string) {
  const channel = await prisma.projectChannel.findUniqueOrThrow({ where: { id: channelId } });
  await prisma.projectChannel.update({ where: { id: channelId }, data: { active: !channel.active } });
  revalidatePath(`/admin/afiliados/${projectSlug}/canais`);
}
