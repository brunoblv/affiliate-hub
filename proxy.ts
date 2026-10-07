import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { blogSubdomainFromHost, blogUrl } from "@/lib/blog/hosts";

/**
 * 1. Subdomínio de blog (meunovolar.capibusca.com.br/x) -> reescreve para /b/meunovolar/x.
 *    Mídia, assets e /_next passam direto: são os mesmos do site principal.
 * 2. /b/... acessado pelo host principal -> 308 para o subdomínio (sem conteúdo duplicado).
 * 3. /admin e /conta -> sessão do Auth.js (callback `authorized`).
 *
 * O `auth` é chamado só no passo 3: embrulhar o proxy inteiro com `auth(handler)`
 * faria o handler rodar mesmo quando `authorized` recusa.
 */
const SHARED_PREFIXES = ["/_next/", "/midia/", "/api/", "/capi/", "/blogs/"];
const SHARED_FILES = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|css|js|woff2?|wav|mp3|webmanifest)$/i;

const authProxy = auth as unknown as (request: NextRequest, event: NextFetchEvent) => Promise<Response>;

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname, search } = request.nextUrl;
  const subdomain = blogSubdomainFromHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));

  if (subdomain) {
    if (SHARED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || SHARED_FILES.test(pathname)) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/b/${subdomain}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  const blogPath = pathname.match(/^\/b\/([a-z0-9-]+)(\/.*)?$/);
  if (blogPath) {
    return NextResponse.redirect(blogUrl(blogPath[1]!, `${blogPath[2] ?? "/"}${search}`), 308);
  }

  if (/^\/(?:admin|conta)(?:\/|$)/.test(pathname)) return authProxy(request, event);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
