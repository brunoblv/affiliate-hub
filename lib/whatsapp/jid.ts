/** Grupo comum do WhatsApp. */
export function ehJidGrupoWhatsApp(jid: string): boolean {
  return jid.endsWith("@g.us");
}

/** Canal de transmissão (broadcast) — JID real, não o link de convite. */
export function ehJidCanalWhatsApp(jid: string): boolean {
  return jid.endsWith("@newsletter");
}

export function ehJidWhatsApp(jid: string): boolean {
  return ehJidGrupoWhatsApp(jid) || ehJidCanalWhatsApp(jid);
}
