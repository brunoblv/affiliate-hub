/**
 * Dia civil em America/Sao_Paulo (UTC-3 fixo: o Brasil não tem horário de verão desde 2019).
 */
const OFFSET_HOURS = 3;

/** Instante UTC em que o dia de São Paulo de `now` começou. */
export function saoPauloDayStart(now: Date): Date {
  const local = new Date(now.getTime() - OFFSET_HOURS * 3_600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), OFFSET_HOURS));
}

/** Valor para colunas `@db.Date`: meia-noite UTC da data de São Paulo. */
export function saoPauloDate(now: Date): Date {
  const local = new Date(now.getTime() - OFFSET_HOURS * 3_600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function saoPauloHour(now: Date): number {
  return new Date(now.getTime() - OFFSET_HOURS * 3_600_000).getUTCHours();
}
