import { FUSO_APP, lerHorario, partesNoFuso } from "./fuso";

/** Janela operacional em Brasília — nunca agenda fora disso (evita post à meia-noite). */
export const JANELA_INICIO = "09:00";
export const JANELA_FIM = "21:00";
export const INTERVALO_PADRAO_MIN = 10;

/** Gera "HH:mm" de `inicio` até `fim` (inclusive), a cada `intervaloMin` minutos. */
export function gerarHorariosDaJanela(
  intervaloMin: number,
  inicio: string = JANELA_INICIO,
  fim: string = JANELA_FIM,
): string[] {
  const comeco = lerHorario(inicio);
  const termo = lerHorario(fim);
  const passo = Math.max(1, Math.floor(intervaloMin) || INTERVALO_PADRAO_MIN);
  const horarios: string[] = [];
  let cursor = comeco.hora * 60 + comeco.minuto;
  const limite = termo.hora * 60 + termo.minuto;

  while (cursor <= limite) {
    const hora = Math.floor(cursor / 60);
    const minuto = cursor % 60;
    horarios.push(`${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`);
    cursor += passo;
  }

  return horarios;
}

export function tetoDaJanela(intervaloMin: number): number {
  return gerarHorariosDaJanela(intervaloMin).length;
}

export const TETO_PADRAO = tetoDaJanela(INTERVALO_PADRAO_MIN);
export const HORARIOS_PADRAO = gerarHorariosDaJanela(INTERVALO_PADRAO_MIN);

export function estaNaJanelaDePublicacao(instante: Date, fuso: string = FUSO_APP): boolean {
  const { hora, minuto } = partesNoFuso(instante, fuso);
  const minutos = hora * 60 + minuto;
  const inicio = lerHorario(JANELA_INICIO);
  const fim = lerHorario(JANELA_FIM);
  return minutos >= inicio.hora * 60 + inicio.minuto && minutos <= fim.hora * 60 + fim.minuto;
}

export function rotuloJanela(intervaloMin: number = INTERVALO_PADRAO_MIN): string {
  return `${JANELA_INICIO}–${JANELA_FIM} a cada ${Math.max(1, intervaloMin)} min (Brasília)`;
}
