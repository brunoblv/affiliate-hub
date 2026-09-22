import { prisma } from "@/lib/db";
import { getConnector as defaultGetConnector, type Connector } from "@/lib/connectors";
import { applyFailure, applySuccess, loadOffer, type Outcome } from "./apply";
import { syncConfig, type SyncConfig } from "./config";

export interface RunDeps {
  getConnector: (key: string | null | undefined) => Connector | null;
  now: () => Date;
  config: SyncConfig;
  /** Espera entre consultas do mesmo conector (limite de taxa). Injetável para os testes. */
  sleep: (ms: number) => Promise<void>;
}

const defaultDeps: RunDeps = {
  getConnector: defaultGetConnector,
  now: () => new Date(),
  config: syncConfig,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Espaça as consultas de cada conector (uma "fila de saída" por chave). */
const nextSlot = new Map<string, number>();
async function pace(connector: Connector, deps: RunDeps) {
  const now = Date.now();
  const slot = Math.max(now, nextSlot.get(connector.key) ?? 0);
  nextSlot.set(connector.key, slot + connector.limits.minIntervalMs);
  if (slot > now) await deps.sleep(slot - now);
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Executa um job já reservado (status RUNNING). Termina sempre em DONE, FAILED ou
 * de volta em QUEUED com espera (nova tentativa); nunca deixa o job "pendurado".
 */
export async function processJob(jobId: string, overrides: Partial<RunDeps> = {}): Promise<Outcome | { kind: "skipped"; why: string }> {
  const deps = { ...defaultDeps, ...overrides };
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job) return { kind: "skipped", why: "job inexistente" };

  const finish = (status: "DONE" | "FAILED", result: unknown, error?: string) =>
    prisma.syncJob.update({
      where: { id: jobId },
      data: { status, finishedAt: deps.now(), lockedUntil: null, result: result as object, error: error ?? null },
    });

  const offer = await loadOffer(job.offerId);
  const connector = offer ? deps.getConnector(offer.store.connector) : null;

  if (!offer || !offer.active || !offer.store.active || !connector || !offer.externalListingId) {
    const why = !offer ? "oferta removida" : !connector ? "loja sem conector" : "oferta inativa ou sem ID externo";
    await finish("DONE", { outcome: "skipped", why });
    return { kind: "skipped", why };
  }
  if (!connector.isConfigured()) {
    // Não é culpa da oferta: não conta falha, só registra para o painel avisar.
    await finish("FAILED", { outcome: "not_configured" }, `${connector.label}: credenciais ausentes.`);
    return { kind: "skipped", why: "credenciais ausentes" };
  }

  try {
    await pace(connector, deps);
    const result = await connector.fetchOffer({
      externalListingId: offer.externalListingId,
      externalSellerId: offer.externalSellerId,
      originalUrl: offer.originalUrl,
    });

    const outcome =
      result.kind === "ok"
        ? await applySuccess(offer, result, deps.now(), deps.config)
        : await applyFailure(offer, { kind: "not_found" }, deps.now(), deps.config);
    await finish("DONE", { outcome: outcome.kind, ...outcome });
    return outcome;
  } catch (error) {
    // Falha de rede/API. Enquanto houver tentativas, o job volta para a fila com espera crescente.
    if (job.attempts < deps.config.maxAttempts) {
      const waitMs = deps.config.retryBaseSeconds * 1000 * 2 ** (job.attempts - 1);
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "QUEUED",
          reason: "RETRY",
          scheduledFor: new Date(deps.now().getTime() + waitMs),
          lockedUntil: null,
          error: message(error).slice(0, 500),
        },
      });
      return { kind: "error", message: message(error) };
    }
    const outcome = await applyFailure(offer, { kind: "error", message: message(error) }, deps.now(), deps.config);
    await finish("FAILED", { outcome: "error" }, message(error).slice(0, 500));
    return outcome;
  }
}
