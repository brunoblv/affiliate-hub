import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildMetaAuthorizationUrl } from "@/lib/meta/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const redirectUri = process.env.META_REDIRECT_URI ?? new URL("/api/integrations/meta/callback", request.url).toString();

  const authorizationUrl = buildMetaAuthorizationUrl(redirectUri);
  return NextResponse.redirect(authorizationUrl);
}
