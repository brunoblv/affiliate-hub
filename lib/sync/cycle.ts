/**
 * Início do ciclo diário: a última ocorrência de `startHour`:00 em America/Sao_Paulo
 * (UTC-3 fixo: o Brasil não tem horário de verão desde 2019). Uma oferta está
 * "em dia" quando sua última coleta bem-sucedida é posterior a esse instante.
 */
const SP_OFFSET_HOURS = 3;
const HOUR = 60 * 60 * 1000;

export function cycleStart(now: Date, startHour: number): Date {
  const shifted = new Date(now.getTime() - SP_OFFSET_HOURS * HOUR); // relógio de São Paulo lido como UTC
  const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), startHour);
  const spStart = shifted.getTime() >= start ? start : start - 24 * HOUR;
  return new Date(spStart + SP_OFFSET_HOURS * HOUR);
}
