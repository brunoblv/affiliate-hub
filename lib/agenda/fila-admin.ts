import { Rede } from "@/lib/database/enums";
import { chaveDoDia } from "./fuso";

export const REDE_PADRAO_FILA = Rede.WHATSAPP;

export const REDES_FILA: Array<{ id: Rede; label: string }> = [
  { id: Rede.WHATSAPP, label: "WhatsApp" },
  { id: Rede.TELEGRAM, label: "Telegram" },
  { id: Rede.FACEBOOK_PAGE, label: "Facebook" },
  { id: Rede.FACEBOOK_GROUP, label: "Grupos FB" },
  { id: Rede.INSTAGRAM, label: "Instagram" },
];

export const LABEL_REDE_FILA: Record<Rede, string> = {
  [Rede.WHATSAPP]: "WhatsApp",
  [Rede.TELEGRAM]: "Telegram",
  [Rede.FACEBOOK_PAGE]: "Facebook",
  [Rede.FACEBOOK_GROUP]: "Grupos do Facebook",
  [Rede.INSTAGRAM]: "Instagram",
};

export type RedeFila = Rede | "todas";

export function ehRedeFila(valor: string | undefined): valor is Rede {
  return !!valor && REDES_FILA.some((item) => item.id === valor);
}

export function hrefFila(opts: {
  dia?: string | null;
  rede: RedeFila;
  canalId?: string | null;
  page?: number;
  q?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.dia) params.set("dia", opts.dia);
  if (opts.rede !== REDE_PADRAO_FILA) params.set("rede", opts.rede);
  if (opts.canalId) params.set("canal", opts.canalId);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const query = params.toString();
  return query ? `/admin/fila?${query}` : "/admin/fila";
}

/** Abre a fila no dia e no canal em que o item realmente caiu — não no "hoje" vazio. */
export function hrefFilaDoAgendamento(resultado: {
  canalId: string;
  agendadaPara?: string;
}): string {
  return hrefFila({
    dia: resultado.agendadaPara ? chaveDoDia(new Date(resultado.agendadaPara)) : "todos",
    rede: REDE_PADRAO_FILA,
    canalId: resultado.canalId,
  });
}
