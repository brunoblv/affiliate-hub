import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { exchangeMercadoLivreAuthCode } from "@/lib/mercado-livre/auth";
import { logger } from "@/lib/logging";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("ml_pkce_verifier")?.value;
  const expectedState = cookieStore.get("ml_oauth_state")?.value;

  const redirectFail = NextResponse.redirect(new URL("/admin/integrations?ml=error", getSiteUrl()));

  if (error || !code || !codeVerifier || !state || state !== expectedState) {
    logger.warn("PRODUCT_SYNC", "Mercado Livre: callback OAuth inválido (state/code_verifier ausente ou divergente)");
    return redirectFail;
  }

  const redirectUri =
    process.env.MERCADOLIVRE_REDIRECT_URI ?? new URL("/api/integrations/mercado-livre/callback", request.url).toString();

  try {
    await exchangeMercadoLivreAuthCode({ code, redirectUri, codeVerifier });
    const response = NextResponse.redirect(new URL("/admin/integrations?ml=connected", getSiteUrl()));
    response.cookies.delete("ml_pkce_verifier");
    response.cookies.delete("ml_oauth_state");
    return response;
  } catch (err) {
    logger.error("PRODUCT_SYNC", "Mercado Livre: callback OAuth falhou", { error: err instanceof Error ? err.message : err });
    return redirectFail;
  }
}
