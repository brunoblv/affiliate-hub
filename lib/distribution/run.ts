import { prisma } from "@/lib/db";
import { readCreativeFile } from "@/lib/creatives/storage";
import { claimPublication } from "./queue";
import { preparePublication, DistributionError } from "./prepare";
import { distributionEnabled } from "./rules";
import { sendTelegram, type SendOutcome } from "./telegram";

export async function processPublication(): Promise<string> {
  if (!distributionEnabled() || !process.env.TELEGRAM_BOT_TOKEN) return "disabled";
  const row = await claimPublication();
  if (!row) return "idle";
  let outcome: SendOutcome;
  try {
    const current = await preparePublication(prisma, row);
    if (current.fingerprint !== row.fingerprint) throw new DistributionError("Preço, link, destino ou dados aprovados mudaram. Prepare e aprove uma nova publicação.");
    let photo: Buffer | undefined;
    if (row.creativeId) {
      const creative = await prisma.creative.findUniqueOrThrow({ where: { id: row.creativeId } });
      photo = await readCreativeFile(creative.file) ?? undefined;
      if (!photo) throw new DistributionError("Arquivo da capa não encontrado. Nenhuma mensagem foi enviada.");
    }
    // Registra exatamente o texto/observação enviados, inclusive coleta mais recente sem mudança de preço.
    await prisma.publication.update({ where: { id: row.id }, data: { text: current.text, priceObservedAt: current.priceObservedAt } });
    outcome = await sendTelegram({ targetId: row.targetId, text: current.text, photo }, process.env.TELEGRAM_BOT_TOKEN);
  } catch (error) {
    outcome = { status: "FAILED", error: error instanceof DistributionError ? error.message : "Falha na preparação. Nenhuma mensagem foi enviada." };
  }
  // Falha de banco daqui em diante não é falha de envio: SENDING será recuperado como UNCERTAIN.
  await prisma.$transaction(async (tx) => {
    const latest = await tx.publication.findUnique({ where: { id: row.id } });
    if (!latest || !["SENDING", "UNCERTAIN"].includes(latest.status) || latest.startedAt?.getTime() !== row.startedAt?.getTime()) return;
    if (outcome.status === "SENT") {
      await tx.publication.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), externalId: outcome.externalId, error: null,
        attempts: { create: { status: "SENT", externalId: outcome.externalId } } } });
      if (row.creativeId) await tx.creative.update({ where: { id: row.creativeId }, data: { status: "PUBLISHED" } });
    } else {
      const retry = outcome.status === "RETRY" && row.attemptCount < 3;
      const status = retry ? "QUEUED" : outcome.status === "UNCERTAIN" ? "UNCERTAIN" : "FAILED";
      await tx.publication.update({ where: { id: row.id }, data: { status, error: outcome.error,
        ...(retry && outcome.status === "RETRY" ? { scheduledFor: new Date(Date.now() + outcome.retryAfter * 1000) } : {}),
        attempts: { create: { status, detail: outcome.error } } } });
    }
  });
  return outcome.status;
}
