/** Grupo comum do WhatsApp. */
export function ehJidGrupoWhatsApp(jid: string): boolean {
  return jid.endsWith("@g.us");
}

/** Canal de transmissão (broadcast / Business) — JID real, não o link de convite. */
export function ehJidCanalWhatsApp(jid: string): boolean {
  return jid.endsWith("@newsletter");
}

export function ehJidWhatsApp(jid: string): boolean {
  return ehJidGrupoWhatsApp(jid) || ehJidCanalWhatsApp(jid);
}

export type TipoDestinoWhatsApp = "grupo" | "canal" | "invalido";

export function tipoDestinoWhatsApp(jid: string): TipoDestinoWhatsApp {
  const valor = jid.trim();
  if (ehJidGrupoWhatsApp(valor)) return "grupo";
  if (ehJidCanalWhatsApp(valor)) return "canal";
  return "invalido";
}

/** Como o destino aparece na fila: grupo comum vs canal de transmissão. */
export function rotuloDestinoWhatsApp(canal: { nome: string; idExterno: string }): string {
  const tipo = tipoDestinoWhatsApp(canal.idExterno);
  if (tipo === "canal") return `Canal · ${canal.nome}`;
  if (tipo === "grupo") return `Grupo · ${canal.nome}`;
  return canal.nome;
}
