import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { buildMetaAuthorizationUrl } from "@/lib/meta/auth";

const COOKIE_MAX_AGE = 10 * 60;

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const redirectUri =
    process.env.META_REDIRECT_URI ?? new URL("/api/integrations/meta/callback", request.url).toString();

  const state = randomBytes(16).toString("hex");
  const authorizationUrl = buildMetaAuthorizationUrl({ redirectUri, state });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/api/integrations/meta",
  });

  return response;
}
