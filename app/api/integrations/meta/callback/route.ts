import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeMetaAuthCode } from "@/lib/meta/auth";
import { logger } from "@/lib/logging";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/admin/integrations?meta=error", request.url));
  }

  const redirectUri = process.env.META_REDIRECT_URI ?? new URL("/api/integrations/meta/callback", request.url).toString();

  try {
    await exchangeMetaAuthCode(code, redirectUri);
    return NextResponse.redirect(new URL("/admin/integrations?meta=connected", request.url));
  } catch (err) {
    logger.error("PUBLISH", "Meta: callback OAuth falhou", { error: err instanceof Error ? err.message : err });
    return NextResponse.redirect(new URL("/admin/integrations?meta=error", request.url));
  }
}
