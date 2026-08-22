import pino from "pino";
import { prisma } from "@/lib/database";

export type LogScope =
  | "PRODUCT_SYNC"
  | "PRODUCT_SCORE"
  | "CONTENT"
  | "IMAGE_GENERATION"
  | "PUBLISH"
  | "WEBHOOK"
  | "JOB"
  | "AFFILIATE_SYNC"
  | "AUTH"
  | "AUTOPILOT"
  | "SYSTEM";

export type LogLevel = "debug" | "info" | "warn" | "error";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

/** O model Log v2 só distingue INFO/ERRO (spec §9) — debug/warn caem em INFO. */
async function persist(level: LogLevel, scope: LogScope, message: string, meta?: unknown) {
  try {
    await prisma.log.create({
      data: {
        nivel: level === "error" ? "ERRO" : "INFO",
        area: scope,
        mensagem: message,
        contexto: meta === undefined ? undefined : (meta as object),
      },
    });
  } catch {
    // A falha ao persistir log não deve derrubar o fluxo que originou o log.
  }
}

function log(level: LogLevel, scope: LogScope, message: string, meta?: unknown) {
  pinoLogger[level]({ scope, ...(meta ? { meta } : {}) }, message);
  void persist(level, scope, message, meta);
}

export const logger = {
  debug: (scope: LogScope, message: string, meta?: unknown) => log("debug", scope, message, meta),
  info: (scope: LogScope, message: string, meta?: unknown) => log("info", scope, message, meta),
  warn: (scope: LogScope, message: string, meta?: unknown) => log("warn", scope, message, meta),
  error: (scope: LogScope, message: string, meta?: unknown) => log("error", scope, message, meta),
};
