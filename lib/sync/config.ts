const number = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/** Ajustável por ambiente (RF-08: horário, concorrência e limiares configuráveis). */
export const syncConfig = {
  /** Hora (America/Sao_Paulo) em que o ciclo diário começa. */
  startHour: number("SYNC_START_HOUR", 3),
  /** Tentativas por job antes de contar como falha da oferta. */
  maxAttempts: number("SYNC_MAX_ATTEMPTS", 3),
  /** Variação acima disso (0.4 = 40%) não é publicada sozinha: vai para revisão. */
  maxPriceChange: number("SYNC_MAX_PRICE_CHANGE", 0.4),
  /** Falhas seguidas até a oferta ser marcada com erro. */
  failuresUntilError: number("SYNC_FAILURES_UNTIL_ERROR", 3),
  /** Não-encontrado seguidas até a oferta ser marcada como desatualizada. */
  notFoundUntilStale: number("SYNC_NOT_FOUND_UNTIL_STALE", 2),
  /** Tempo que um worker "segura" um job; passado disso outro worker o retoma. */
  leaseSeconds: number("SYNC_LEASE_SECONDS", 600),
  /** Jobs em paralelo no worker. */
  concurrency: number("SYNC_CONCURRENCY", 2),
  pollMs: number("SYNC_POLL_MS", 5000),
  /** Espera base entre tentativas do mesmo job (dobra a cada tentativa). */
  retryBaseSeconds: number("SYNC_RETRY_BASE_SECONDS", 120),
};

export type SyncConfig = typeof syncConfig;
