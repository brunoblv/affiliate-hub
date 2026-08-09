import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { buildMercadoLivreAuthorizationUrl } from "@/lib/mercado-livre/auth";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/mercado-livre/pkce";

const COOKIE_MAX_AGE = 10 * 60; // 10 minutos — tempo suficiente para o usuário fazer login no ML.

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const redirectUri =
    process.env.MERCADOLIVRE_REDIRECT_URI ?? new URL("/api/integrations/mercado-livre/callback", request.url).toString();

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = randomBytes(16).toString("hex");

  const authorizationUrl = buildMercadoLivreAuthorizationUrl({ redirectUri, codeChallenge, state });

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/api/integrations/mercado-livre",
  };
  response.cookies.set("ml_pkce_verifier", codeVerifier, cookieOptions);
  response.cookies.set("ml_oauth_state", state, cookieOptions);

  return response;
}
