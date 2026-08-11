import { Queue, type ConnectionOptions } from "bullmq";

export const QUEUE_NAMES = [
  "product-import",
  "product-sync",
  "product-score",
  "content-generation",
  "image-generation",
  "publication",
  "analytics-sync",
  "affiliate-sync",
  "url-scrape",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

function getConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL não configurado.");
  }
  return { url } as ConnectionOptions;
}

const queues = new Map<QueueName, Queue>();

/** Obtém (ou cria) a fila BullMQ singleton para um nome de fila conhecido. */
export function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, { connection: getConnection() });
  queues.set(name, queue);
  return queue;
}
