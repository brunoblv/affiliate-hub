/**
 * Conversão entre horário local da operação e UTC.
 *
 * O sistema antigo guardava "19:30" e comparava com `new Date().getHours()` —
 * ou seja, com o fuso do servidor. Container em UTC publicava 3h fora do
 * horário. Aqui o fuso é explícito e vem do .env.
 */

export const FUSO_APP = process.env.TZ_APP ?? "America/Sao_Paulo";

interface PartesData {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

const CAMPOS: Record<string, keyof PartesData> = {
  year: "ano",
  month: "mes",
  day: "dia",
  hour: "hora",
  minute: "minuto",
  second: "segundo",
};

/** Decompõe um instante nas partes de calendário do fuso informado. */
export function partesNoFuso(instante: Date, fuso: string = FUSO_APP): PartesData {
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    hourCycle: "h23",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const partes = {} as PartesData;

  for (const parte of formatador.formatToParts(instante)) {
    const campo = CAMPOS[parte.type];
    if (campo) partes[campo] = Number(parte.value);
  }

  // Intl devolve 24 para meia-noite em alguns runtimes.
  if (partes.hora === 24) partes.hora = 0;

  return partes;
}

/** Deslocamento do fuso, em ms, no instante informado (positivo a leste de Greenwich). */
function deslocamentoMs(instante: Date, fuso: string): number {
  const p = partesNoFuso(instante, fuso);
  const comoSeFosseUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  const semMilissegundos = Math.floor(instante.getTime() / 1000) * 1000;
  return comoSeFosseUtc - semMilissegundos;
}

/**
 * Converte uma data/hora local do fuso da operação para o instante UTC
 * correspondente. Duas passadas resolvem as bordas de horário de verão
 * (o Brasil não tem mais, mas o código não deve depender disso).
 */
export function paraUtc(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  fuso: string = FUSO_APP,
): Date {
  const palpite = Date.UTC(ano, mes - 1, dia, hora, minuto, 0);
  const primeira = palpite - deslocamentoMs(new Date(palpite), fuso);
  const segunda = palpite - deslocamentoMs(new Date(primeira), fuso);
  return new Date(segunda);
}

/** "19:30" ou "9:00" → { hora: 19, minuto: 30 }. Lança se o formato estiver errado. */
export function lerHorario(texto: string): { hora: number; minuto: number } {
  const casamento = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!casamento) throw new Error(`Horário inválido: "${texto}". Use HH:mm.`);

  const hora = Number(casamento[1]);
  const minuto = Number(casamento[2]);

  if (hora > 23 || minuto > 59) throw new Error(`Horário fora do intervalo: "${texto}".`);

  return { hora, minuto };
}

/** Início do dia (00:00 local) que contém o instante, em UTC. */
export function inicioDoDia(instante: Date, fuso: string = FUSO_APP): Date {
  const p = partesNoFuso(instante, fuso);
  return paraUtc(p.ano, p.mes, p.dia, 0, 0, fuso);
}

/** Formata um instante no fuso da operação, para telas e logs. */
export function formatarLocal(instante: Date, fuso: string = FUSO_APP): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    dateStyle: "short",
    timeStyle: "short",
  }).format(instante);
}
