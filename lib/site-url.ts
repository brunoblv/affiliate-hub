/** URL pública do site, usada para montar links rastreados (/go/:code) em posts e no blog. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
