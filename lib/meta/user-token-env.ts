/**
 * Lê META_USER_TOKEN do ambiente.
 * Aceita token colado com segmentos duplicados (EAA…EAA…) e usa o último válido.
 */
export function readMetaUserTokenFromEnv(raw = process.env.META_USER_TOKEN): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const segments = trimmed
    .split(/(?=EAA)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  return segments.at(-1) ?? trimmed;
}

export function metaUserTokenConfigured(): boolean {
  return Boolean(readMetaUserTokenFromEnv());
}
