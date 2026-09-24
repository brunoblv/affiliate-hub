import { prisma } from "@/lib/db";
import type { Prisma, Publication } from "@/lib/generated/prisma/client";
import { DistributionError, preparePublication, type Selection } from "./prepare";
import { DAY, scheduleConflict } from "./rules";

/** Serializa decisões de cadência entre processos; nunca mantém lock durante chamadas externas. */
export async function lockDistribution(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(72831409)`;
}

export async function conflictFor(tx: Prisma.TransactionClient, row: Publication, at: Date) {
  const reservations = await tx.publication.findMany({
    where: { targetId: row.targetId, id: { not: row.id }, status: { in: ["QUEUED", "SENDING", "SENT", "UNCERTAIN"] },
      OR: [{ scheduledFor: { gte: new Date(at.getTime() - 7 * DAY), lte: new Date(at.getTime() + 7 * DAY) } },
        { sentAt: { gte: new Date(at.getTime() - 7 * DAY) } }, { status: { in: ["SENDING", "UNCERTAIN"] } }] },
  });
  if (reservations.some((item) => item.status === "SENDING" || item.status === "UNCERTAIN")) return "Este destino tem um envio em andamento ou resultado incerto. Confira o histórico antes de continuar.";
  return scheduleConflict({ id: row.id, productId: row.productId, title: row.title, at },
    reservations.map((item) => ({ id: item.id, productId: item.productId, title: item.title, at: item.status === "SENT" ? item.sentAt! : item.scheduledFor! })));
}

export async function createDraft(selection: Selection) {
  const data = await preparePublication(prisma, selection);
  return prisma.publication.create({ data });
}

export async function schedulePublication(id: string, scheduledFor: Date, now = new Date()) {
  if (scheduledFor < now || scheduledFor.getTime() > now.getTime() + 30 * DAY) throw new DistributionError("Agende de agora até 30 dias à frente, no horário de São Paulo.");
  return prisma.$transaction(async (tx) => {
    await lockDistribution(tx);
    const row = await tx.publication.findUnique({ where: { id } });
    if (!row || row.status !== "DRAFT") throw new DistributionError("Somente rascunhos podem ser aprovados. Atualize a página.");
    const data = await preparePublication(tx, row, now);
    if (data.fingerprint !== row.fingerprint) throw new DistributionError("Os dados da prévia mudaram. Cancele este rascunho e prepare outro.");
    const conflict = await conflictFor(tx, row, scheduledFor);
    if (conflict) throw new DistributionError(conflict);
    return tx.publication.update({ where: { id }, data: { status: "QUEUED", scheduledFor, error: null } });
  });
}

/** Reservas abandonadas são incertas, NÃO voltam para a fila de envio. */
export async function claimPublication(now = new Date()) {
  return prisma.$transaction(async (tx) => {
    await lockDistribution(tx);
    const abandoned = await tx.publication.findMany({ where: { status: "SENDING", startedAt: { lt: new Date(now.getTime() - 10 * 60_000) } } });
    for (const row of abandoned) await tx.publication.update({ where: { id: row.id }, data: { status: "UNCERTAIN", error: "Worker interrompido durante envio. Confira no Telegram; não haverá reenvio automático.",
      attempts: { create: { status: "UNCERTAIN", detail: "Reserva de envio expirada." } } } });
    const row = await tx.publication.findFirst({ where: { status: "QUEUED", scheduledFor: { lte: now } }, orderBy: [{ scheduledFor: "asc" }, { id: "asc" }] });
    if (!row) return null;
    const conflict = await conflictFor(tx, row, now);
    // Horários vencidos são conferidos de novo: reiniciar o worker não despeja a fila toda.
    if (conflict) {
      await tx.publication.update({ where: { id: row.id }, data: { status: "FAILED", error: conflict,
        attempts: { create: { status: "FAILED", detail: conflict } } } });
      return null;
    }
    return tx.publication.update({ where: { id: row.id }, data: { status: "SENDING", startedAt: now, attemptCount: { increment: 1 },
      attempts: { create: { status: "SENDING", detail: "Envio reservado pelo worker." } } } });
  });
}
