import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { JobStatus, type Prisma } from "@/lib/generated/prisma/client";

const PUBLISH_QUEUE = "affiliate-publish";
const MAX_DUE_PER_TICK = 3;

export interface PublishSchedule {
  /** Minutos entre uma publicação e a próxima. */
  intervalMinutes: number;
  /** Hora do dia (0-23) a partir da qual pode publicar. */
  windowStartHour: number;
  /** Hora do dia (0-23) até a qual pode publicar — depois disso, pula para o windowStartHour do dia seguinte. */
  windowEndHour: number;
}

const DEFAULT_SCHEDULE: PublishSchedule = { intervalMinutes: 90, windowStartHour: 9, windowEndHour: 21 };

export async function getPublishSchedule(): Promise<PublishSchedule> {
  const setting = await prisma.setting.findUnique({ where: { key: "publishSchedule" } });
  const value = (setting?.value as Partial<PublishSchedule> | undefined) ?? {};
  return {
    intervalMinutes: value.intervalMinutes ?? DEFAULT_SCHEDULE.intervalMinutes,
    windowStartHour: value.windowStartHour ?? DEFAULT_SCHEDULE.windowStartHour,
    windowEndHour: value.windowEndHour ?? DEFAULT_SCHEDULE.windowEndHour,
  };
}

/** Avança `from` para o próximo horário válido dentro da janela de postagem permitida. */
function clampToWindow(date: Date, schedule: PublishSchedule): Date {
  const clamped = new Date(date);
  if (clamped.getHours() < schedule.windowStartHour) {
    clamped.setHours(schedule.windowStartHour, 0, 0, 0);
  } else if (clamped.getHours() >= schedule.windowEndHour) {
    clamped.setDate(clamped.getDate() + 1);
    clamped.setHours(schedule.windowStartHour, 0, 0, 0);
  }
  return clamped;
}

/**
 * Calcula o próximo horário de postagem a partir de um cursor, respeitando o
 * intervalo mínimo entre posts e a janela de horário permitida (spec: nunca
 * publicar tudo de uma vez — espalhar ao longo do dia).
 */
export function nextPostingSlot(cursor: Date, schedule: PublishSchedule = DEFAULT_SCHEDULE): Date {
  const next = new Date(cursor.getTime() + schedule.intervalMinutes * 60_000);
  return clampToWindow(next, schedule);
}

export interface QueuePublishInput {
  productId: string;
  affiliateUrl: string;
  subId?: string;
}

/** Enfileira uma publicação de link de afiliado para rodar em `scheduledAt` (processado pelo schedulerTick). */
export async function queuePublish(input: QueuePublishInput, scheduledAt: Date): Promise<void> {
  await prisma.job.create({
    data: {
      queue: PUBLISH_QUEUE,
      name: "Publicação agendada de link de afiliado",
      status: JobStatus.PENDING,
      scheduledAt,
      payload: input as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Processa os jobs de publicação cujo horário já venceu — chamado pelo
 * schedulerTick a cada 60s. Limita quantos processa por tick para reforçar o
 * espaçamento mesmo se vários ficarem "atrasados" ao mesmo tempo (ex: workers
 * ficou fora do ar por um tempo).
 */
export async function runDuePublishJobs(now: Date = new Date()): Promise<void> {
  const dueJobs = await prisma.job.findMany({
    where: { queue: PUBLISH_QUEUE, status: JobStatus.PENDING, scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: MAX_DUE_PER_TICK,
  });

  for (const job of dueJobs) {
    const payload = job.payload as unknown as QueuePublishInput;

    await prisma.job.update({ where: { id: job.id }, data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } } });

    try {
      const { attachAffiliateLinkAndPublish } = await import("@/lib/affiliate/attach-link");
      const result = await attachAffiliateLinkAndPublish(payload);

      await prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.COMPLETED, finishedAt: new Date(), result: { linkId: result.link.id } as unknown as Prisma.InputJsonValue },
      });

      logger.info("PUBLISH", "Publicação agendada executada", { jobId: job.id, productId: payload.productId });
    } catch (error) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.FAILED, finishedAt: new Date(), error: error instanceof Error ? error.message : String(error) },
      });
      logger.error("PUBLISH", "Publicação agendada falhou", { jobId: job.id, productId: payload.productId, error });
    }
  }
}
