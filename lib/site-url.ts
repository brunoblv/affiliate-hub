/** URL pública do site — listas, artigos e vitrine nas redes; /go/:code no blog. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Caminho relativo (`/midia/...`) ou URL absoluta → URL absoluta do site. */
export function urlPublica(caminho: string | null | undefined): string | undefined {
  if (!caminho?.trim()) return undefined;
  const valor = caminho.trim();
  if (/^https?:\/\//i.test(valor)) return valor;
  return `${getSiteUrl()}${valor.startsWith("/") ? valor : `/${valor}`}`;
}
