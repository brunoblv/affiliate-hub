import { Rede } from "@/lib/database/enums";

/**
 * Destinos de divulgação de uma lista pré-feita da loja.
 * Pinterest não tem publicador automático — gera legenda para copiar.
 */
export const DESTINOS_LISTA_OFERTA = [
  { id: "WHATSAPP", label: "WhatsApp", rede: Rede.WHATSAPP },
  { id: "TELEGRAM", label: "Telegram", rede: Rede.TELEGRAM },
  { id: "PINTEREST", label: "Pinterest", rede: null },
  { id: "FACEBOOK_PAGE", label: "Página do Facebook", rede: Rede.FACEBOOK_PAGE },
] as const;

export type DestinoListaOfertaId = (typeof DESTINOS_LISTA_OFERTA)[number]["id"];

const IDS = new Set<string>(DESTINOS_LISTA_OFERTA.map((d) => d.id));

export function parseRedesListaOferta(valor: unknown): DestinoListaOfertaId[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is DestinoListaOfertaId => typeof item === "string" && IDS.has(item));
}

export function redesPublicaveis(redes: DestinoListaOfertaId[]): Rede[] {
  const saida: Rede[] = [];
  for (const id of redes) {
    const destino = DESTINOS_LISTA_OFERTA.find((d) => d.id === id);
    if (destino?.rede && !saida.includes(destino.rede)) saida.push(destino.rede);
  }
  return saida;
}

export function incluiPinterest(redes: DestinoListaOfertaId[]): boolean {
  return redes.includes("PINTEREST");
}

export const LABEL_DESTINO_LISTA: Record<DestinoListaOfertaId, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  PINTEREST: "Pinterest",
  FACEBOOK_PAGE: "Página do Facebook",
};
