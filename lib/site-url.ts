/** URL pública do site — listas, artigos e vitrine nas redes; /go/:code no blog. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
