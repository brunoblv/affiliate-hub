"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./guard";
import { prisma } from "@/lib/db";
import { createDraft, lockDistribution, schedulePublication } from "@/lib/distribution/queue";
import { DistributionError } from "@/lib/distribution/prepare";
import { scheduleDate } from "@/lib/distribution/rules";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
function back(message?: string): never {
  revalidatePath("/admin/distribuicao");
  redirect(`/admin/distribuicao${message ? `?erro=${encodeURIComponent(message)}` : "?salvo=1"}`);
}
const message = (error: unknown) => error instanceof DistributionError ? error.message : "Não foi possível concluir. Atualize a página e confira a configuração.";

export async function prepareDistribution(form: FormData) {
  await requireAdmin();
  try { await createDraft({ communityId: text(form, "communityId"), linkId: text(form, "linkId"), creativeId: text(form, "creativeId") || null }); }
  catch (error) { back(message(error)); }
  back();
}

export async function approveDistribution(form: FormData) {
  await requireAdmin();
  if (form.get("approved") !== "on") back("Confirme que revisou o destino, o texto e a capa.");
  const date = scheduleDate(text(form, "scheduledFor"));
  if (!date) back("Informe data e hora válidas em São Paulo.");
  try { await schedulePublication(text(form, "id"), date); }
  catch (error) { back(message(error)); }
  back();
}

export async function cancelDistribution(form: FormData) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await lockDistribution(tx);
    await tx.publication.updateMany({ where: { id: text(form, "id"), status: { in: ["DRAFT", "QUEUED", "FAILED"] } }, data: { status: "CANCELED" } });
  });
  back();
}

/** Reconciliação manual: não faz chamadas ao Telegram e nunca reenvia mensagens. */
export async function resolveDistribution(form: FormData) {
  await requireAdmin();
  if (form.get("checked") !== "on") back("Confira o histórico no Telegram antes de resolver um resultado incerto.");
  const sent = text(form, "result") === "sent";
  const externalId = text(form, "externalId");
  if (sent && !/^[1-9]\d*$/.test(externalId)) back("Informe o ID da mensagem que você encontrou no Telegram.");
  await prisma.$transaction(async (tx) => {
    await lockDistribution(tx);
    const row = await tx.publication.findUnique({ where: { id: text(form, "id") } });
    if (!row || row.status !== "UNCERTAIN") return;
    await tx.publication.update({ where: { id: row.id }, data: { status: sent ? "SENT" : "CANCELED", externalId: sent ? externalId : null,
      sentAt: sent ? row.startedAt : null, error: null,
      attempts: { create: { status: sent ? "SENT" : "CANCELED", detail: "Resultado conferido manualmente pelo administrador.", externalId: sent ? externalId : null } } } });
    if (sent && row.creativeId) await tx.creative.update({ where: { id: row.creativeId }, data: { status: "PUBLISHED" } });
  });
  back();
}
