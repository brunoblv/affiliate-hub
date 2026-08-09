"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { AutopilotMode, Channel } from "@/lib/generated/prisma/client";
import { runAutopilotRule } from "@/lib/autopilot";
import { logger } from "@/lib/logging";

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCategoryList(value: FormDataEntryValue | null): string[] | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Cria uma regra de Autopilot (spec §27/§28). */
export async function createAutopilotRuleAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const mode = String(formData.get("mode") ?? "") as AutopilotMode;
  if (!Object.values(AutopilotMode).includes(mode)) throw new Error("Modo inválido.");

  const channel = String(formData.get("channel") ?? "") as Channel;
  if (!Object.values(Channel).includes(channel)) throw new Error("Canal inválido.");

  await prisma.autopilotRule.create({
    data: {
      name,
      mode,
      channel,
      minScore: parseNumber(formData.get("minScore")),
      minDiscount: parseNumber(formData.get("minDiscount")),
      minRating: parseNumber(formData.get("minRating")),
      minCommission: parseNumber(formData.get("minCommission")),
      minSales: parseNumber(formData.get("minSales")),
      minPrice: parseNumber(formData.get("minPrice")),
      maxPrice: parseNumber(formData.get("maxPrice")),
      maxPublicationsPerDay: parseNumber(formData.get("maxPublicationsPerDay")) ?? 10,
      targetCampaignId: String(formData.get("targetCampaignId") ?? "") || undefined,
      allowedCategoryIds: parseCategoryList(formData.get("allowedCategoryIds")),
      blockedCategoryIds: parseCategoryList(formData.get("blockedCategoryIds")),
    },
  });

  logger.info("AUTOPILOT", "Regra criada", { name, mode, channel });
  revalidatePath("/admin/autopilot/rules");
}

export async function toggleAutopilotRuleAction(ruleId: string) {
  const rule = await prisma.autopilotRule.findUniqueOrThrow({ where: { id: ruleId } });
  await prisma.autopilotRule.update({ where: { id: ruleId }, data: { active: !rule.active } });
  revalidatePath("/admin/autopilot/rules");
}

export async function deleteAutopilotRuleAction(ruleId: string) {
  await prisma.autopilotRule.delete({ where: { id: ruleId } });
  revalidatePath("/admin/autopilot/rules");
}

/** Dispara a regra manualmente (útil para testar sem esperar o tick de 60s). */
export async function runAutopilotRuleNowAction(ruleId: string) {
  const rule = await prisma.autopilotRule.findUniqueOrThrow({ where: { id: ruleId } });

  if (rule.mode !== AutopilotMode.AUTOMATIC) {
    throw new Error('Só é possível "Rodar agora" em regras no modo Automático.');
  }

  const result = await runAutopilotRule(ruleId);
  logger.info("AUTOPILOT", "Regra disparada manualmente", { ruleId, ...result });
  revalidatePath("/admin/autopilot/rules");
  revalidatePath("/admin/content");
}
