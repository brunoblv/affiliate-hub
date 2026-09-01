import { partesNoFuso } from "@/lib/agenda/fuso";

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Dia civil no fuso da operação, como Date UTC (00:00) — casa com coluna DATE do Prisma. */
export function dataCivil(instante: Date = new Date()): Date {
  const p = partesNoFuso(instante);
  return new Date(Date.UTC(p.ano, p.mes - 1, p.dia));
}

export function isoDataCivil(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function slugDaLanding(prefixo: string, data: Date): string {
  return `${prefixo}-${isoDataCivil(data)}`;
}

export function diaDaSemana(data: Date): string {
  return DIAS[data.getUTCDay()] ?? "hoje";
}

export function formatarDataCivil(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "long" }).format(data);
}
