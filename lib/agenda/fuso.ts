/**
 * Conversão entre horário local da operação e UTC.
 *
 * Sempre America/Sao_Paulo (Brasília). `TZ_APP=""` (string vazia) não pode
 * cair no `??` e deixar o Intl no fuso do servidor — em container UTC isso
 * agenda 21h como 00h do dia seguinte.
 */

export const FUSO_APP = process.env.TZ_APP?.trim() || "America/Sao_Paulo";

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

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formata um instante no fuso da operação, para telas e logs. */
export function formatarLocal(instante: Date, fuso: string = FUSO_APP): string {
  const p = partesNoFuso(instante, fuso);
  return `${doisDigitos(p.dia)}/${doisDigitos(p.mes)}/${p.ano}, ${doisDigitos(p.hora)}:${doisDigitos(p.minuto)} (Brasília)`;
}

/** ISO 8601 → texto em Brasília. Uso em client components que só têm a string. */
export function formatarIsoLocal(iso: string, fuso: string = FUSO_APP): string {
  return formatarLocal(new Date(iso), fuso);
}

/** Valor para `<input type="datetime-local">` / prompt, já em Brasília — nunca recortar o ISO UTC. */
export function paraInputDatetimeLocal(instante: Date, fuso: string = FUSO_APP): string {
  const p = partesNoFuso(instante, fuso);
  return `${p.ano}-${doisDigitos(p.mes)}-${doisDigitos(p.dia)}T${doisDigitos(p.hora)}:${doisDigitos(p.minuto)}`;
}

/** Interpreta "AAAA-MM-DDTHH:mm" como horário de Brasília (não como UTC nem como fuso do servidor). */
export function deInputDatetimeLocal(texto: string, fuso: string = FUSO_APP): Date {
  const casamento = /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!casamento) throw new Error(`Data inválida: "${texto}". Use AAAA-MM-DDTHH:mm.`);

  const ano = Number(casamento[1]);
  const mes = Number(casamento[2]);
  const dia = Number(casamento[3]);
  const hora = Number(casamento[4]);
  const minuto = Number(casamento[5]);

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23 || minuto > 59) {
    throw new Error(`Data inválida: "${texto}".`);
  }

  return paraUtc(ano, mes, dia, hora, minuto, fuso);
}
