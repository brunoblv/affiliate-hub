import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeTikTokAuthCode } from "@/lib/tiktok/auth";
import { logger } from "@/lib/logging";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/admin/integrations?tiktok=error", request.url));
  }

  try {
    await exchangeTikTokAuthCode(code);
    return NextResponse.redirect(new URL("/admin/integrations?tiktok=connected", request.url));
  } catch (error) {
    logger.error("PRODUCT_SYNC", "TikTok: callback OAuth falhou", { error: error instanceof Error ? error.message : error });
    return NextResponse.redirect(new URL("/admin/integrations?tiktok=error", request.url));
  }
}
