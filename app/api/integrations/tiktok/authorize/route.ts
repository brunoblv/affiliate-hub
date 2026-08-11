import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildTikTokAuthorizationUrl } from "@/lib/tiktok/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI ?? new URL("/api/integrations/tiktok/callback", request.url).toString();
    const authorizationUrl = buildTikTokAuthorizationUrl(redirectUri);
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(`/admin/integrations?tiktok=error&reason=${encodeURIComponent(message)}`, request.url),
    );
  }
}
