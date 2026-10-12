const number = (name: string, fallback: number) => {
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? Number.NaN : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const flag = (name: string) => process.env[name] === "true";

/** Lido a cada uso (não congelado no import): o painel e o worker enxergam o .env atual. */
export function discoveryConfig() {
  return {
    /** Nada roda sem isto: nem um request externo. */
    enabled: flag("DISCOVERY_ENABLED"),
    /** Hora (America/Sao_Paulo) da rodada diária. */
    hour: number("DISCOVERY_HOUR", 5),
    dailyLimit: number("DISCOVERY_DAILY_LIMIT", 50),
    minScore: number("DISCOVERY_MIN_SCORE", 55),
    /** Portão de publicação (A.9): construído e desligado. */
    autopublish: flag("DISCOVERY_AUTOPUBLISH"),
    brandedMinPct: number("DISCOVERY_BRANDED_MIN_PCT", 40),
    genericMaxPct: number("DISCOVERY_GENERIC_MAX_PCT", 50),
    /** Pontuação mínima de descoberta para o portão de publicação. */
    publishMinScore: number("DISCOVERY_PUBLISH_MIN_SCORE", 65),
  };
}

export type DiscoveryConfig = ReturnType<typeof discoveryConfig>;
