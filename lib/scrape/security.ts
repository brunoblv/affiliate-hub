/** Indica página de desafio anti-bot (TikTok / captcha / verify). */
export function isSecurityChallengePage(input: {
  title?: string | null;
  html?: string;
  url?: string;
}): boolean {
  const title = (input.title ?? "").toLowerCase();
  const html = (input.html ?? "").toLowerCase();
  const url = (input.url ?? "").toLowerCase();

  const needles = [
    "security check",
    "verify to continue",
    "captcha",
    "please verify",
    "acesso suspeito",
    "verificação de segurança",
    "unusual traffic",
    "are you a human",
    "robot check",
  ];

  if (needles.some((n) => title.includes(n))) return true;
  if (needles.some((n) => html.includes(n) && html.length < 80_000)) return true;
  if (url.includes("captcha") || url.includes("security")) return true;

  // Página quase vazia com título genérico de bloqueio.
  if (title === "security check") return true;
  if (title.includes("tiktok") && html.includes("verify") && !html.includes("application/ld+json") && !html.includes("og:title")) {
    return true;
  }

  return false;
}

export class ScrapeSecurityChallengeError extends Error {
  constructor(url: string) {
    super(
      `Security Check na URL ${url}. Abra com SCRAPE_HEADED=1, resolva o desafio no navegador uma vez (perfil salvo) e tente de novo com intervalo maior.`,
    );
    this.name = "ScrapeSecurityChallengeError";
  }
}
