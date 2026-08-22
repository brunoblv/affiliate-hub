import { NextResponse, type NextRequest } from "next/server";
import { registerClick } from "@/lib/tracking";

/** Redirecionamento rastreado: /go/:code → Produto.linkAfiliado (nunca a URL crua da loja). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const destination = await registerClick({
    codigoCurto: code,
    origem: request.nextUrl.searchParams.get("o"),
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  });

  if (!destination) {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }

  return NextResponse.redirect(destination, { status: 302 });
}
