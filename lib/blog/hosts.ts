/**
 * Endereços dos blogs: cada blog vive em `<subdomain>.<BLOG_BASE_DOMAIN>` (ex.:
 * meunovolar.capibusca.com.br). O proxy reescreve esses hosts para /b/<subdomain>/...,
 * então as páginas do blog usam caminhos simples ("/blog/slug") nos links.
 *
 * Sem banco aqui: roda no proxy a cada requisição. Subdomínio sem blog cadastrado
 * cai no 404 da própria página.
 */

/** Hosts que nunca são blog, mesmo no formato <algo>.<domínio base>. */
const RESERVED = new Set(["www", "admin", "api", "static", "cdn", "mail"]);

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/;

function baseDomain(): string {
  const fromEnv = process.env.BLOG_BASE_DOMAIN?.trim().toLowerCase();
  if (fromEnv) return fromEnv;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      return new URL(site).hostname.replace(/^www\./, "");
    } catch {
      // URL inválida no .env: cai no padrão de desenvolvimento.
    }
  }
  return "localhost";
}

/** "meunovolar.capibusca.com.br:443" -> "meunovolar"; host principal ou desconhecido -> null. */
export function blogSubdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(",")[0]!.trim().toLowerCase().replace(/:\d+$/, "");
  const base = baseDomain();
  if (!hostname.endsWith(`.${base}`)) return null;
  const sub = hostname.slice(0, -(base.length + 1));
  if (!SUBDOMAIN_PATTERN.test(sub) || RESERVED.has(sub)) return null;
  return sub;
}

export function isValidSubdomain(value: string): boolean {
  return SUBDOMAIN_PATTERN.test(value) && !RESERVED.has(value);
}

/** URL pública e absoluta de uma página do blog. */
export function blogUrl(subdomain: string, path = "/"): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let protocol = "https:";
  let port = "";
  try {
    const parsed = new URL(site);
    protocol = parsed.protocol;
    port = parsed.port ? `:${parsed.port}` : "";
  } catch {
    // mantém https sem porta
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}//${subdomain}.${baseDomain()}${port}${suffix === "/" ? "" : suffix}`;
}

/** URL absoluta no site principal (produtos, /go, mídia) — usada nas páginas do blog. */
export function mainSiteUrl(path = "/"): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${site}${path.startsWith("/") ? path : `/${path}`}`;
}
