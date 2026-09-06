import { Rede } from "@/lib/database/enums";
import { FUSO_APP, lerHorario, paraUtc, partesNoFuso } from "./fuso";

/** Janela operacional em Brasília — nunca agenda fora disso (evita post à meia-noite). */
export const JANELA_INICIO = "09:00";
export const JANELA_FIM = "21:00";
export const INTERVALO_PADRAO_MIN = 10;

/** WhatsApp e Telegram: 09:00–21:00 com intervalo aleatório entre 10 e 20 min. */
export const INTERVALO_GRUPO_MIN = 10;
export const INTERVALO_GRUPO_MAX = 20;

export function ehCanalDeGrupo(rede: Rede): boolean {
  return rede === Rede.TELEGRAM || rede === Rede.WHATSAPP;
}

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

export function rotuloJanela(intervaloMin: number = INTERVALO_PADRAO_MIN, rede?: Rede): string {
  if (rede && ehCanalDeGrupo(rede)) {
    return `${JANELA_INICIO}–${JANELA_FIM} a cada ${INTERVALO_GRUPO_MIN}–${INTERVALO_GRUPO_MAX} min (Brasília)`;
  }
  return `${JANELA_INICIO}–${JANELA_FIM} a cada ${Math.max(1, intervaloMin)} min (Brasília)`;
}

/** Empurra o instante para dentro da janela 09:00–21:00 (Brasília): antes das 9h vira 9h; depois das 21h vira 9h do dia seguinte. */
export function avancarParaJanela(instante: Date, fuso: string = FUSO_APP): Date {
  const p = partesNoFuso(instante, fuso);
  const minutos = p.hora * 60 + p.minuto;
  const inicio = lerHorario(JANELA_INICIO);
  const fim = lerHorario(JANELA_FIM);
  const inicioMin = inicio.hora * 60 + inicio.minuto;
  const fimMin = fim.hora * 60 + fim.minuto;

  if (minutos < inicioMin) {
    return paraUtc(p.ano, p.mes, p.dia, inicio.hora, inicio.minuto, fuso);
  }
  if (minutos > fimMin) {
    return paraUtc(p.ano, p.mes, p.dia + 1, inicio.hora, inicio.minuto, fuso);
  }
  return paraUtc(p.ano, p.mes, p.dia, p.hora, p.minuto, fuso);
}

/** Minutos aleatórios no intervalo fechado 10–20, para os grupos não saírem todos no relógio cheio. */
export function minutosAleatoriosDoGrupo(): number {
  return INTERVALO_GRUPO_MIN + Math.floor(Math.random() * (INTERVALO_GRUPO_MAX - INTERVALO_GRUPO_MIN + 1));
}
