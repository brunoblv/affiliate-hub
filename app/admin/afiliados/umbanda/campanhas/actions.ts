"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { getUmbandaProject } from "@/lib/projects";
import { CampaignStatus } from "@/lib/generated/prisma/client";

export async function createUmbandaCampaignAction(formData: FormData) {
  const project = await getUmbandaProject();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const code = String(formData.get("code") ?? "").trim().toUpperCase() || undefined;
  const channel = String(formData.get("channel") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim() || undefined;

  await prisma.campaign.create({
    data: { projectId: project.id, name, code, channel, description, status: CampaignStatus.DRAFT },
  });

  revalidatePath("/admin/afiliados/umbanda/campanhas");
}

export async function setUmbandaCampaignStatusAction(campaignId: string, status: CampaignStatus) {
  await prisma.campaign.update({ where: { id: campaignId }, data: { status } });
  revalidatePath("/admin/afiliados/umbanda/campanhas");
}
