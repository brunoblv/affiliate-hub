import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { exchangeMetaAuthCode, getMetaRedirectUri } from "@/lib/meta/auth";
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
  const expectedState = cookieStore.get("meta_oauth_state")?.value;

  const destino = (status: string) => {
    const response = NextResponse.redirect(new URL(`/admin/integracoes?meta=${status}`, getSiteUrl()));
    response.cookies.set("meta_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/integrations/meta",
      maxAge: 0,
    });
    return response;
  };

  if (error === "access_denied") {
    return destino("denied");
  }

  if (error || !code || !state || state !== expectedState) {
    logger.warn("PUBLISH", "Meta: callback OAuth inválido (state/code ausente ou divergente)", { error });
    return destino("error");
  }

  const redirectUri = getMetaRedirectUri();

  try {
    await exchangeMetaAuthCode({ code, redirectUri });
    return destino("connected");
  } catch (err) {
    logger.error("PUBLISH", "Meta: callback OAuth falhou", { error: err instanceof Error ? err.message : err });
    return destino("error");
  }
}
