import { NextResponse } from "next/server";

/**
 * Auth opcional das rotas públicas da Loja ChartFM.
 * Sem `CHARTFM_STORE_API_KEY` no env, a rota fica aberta (dev / server-to-server sem chave).
 */
export function assertChartfmStoreApiAccess(request: Request): NextResponse | null {
  const expected = process.env.CHARTFM_STORE_API_KEY?.trim();
  if (!expected) return null;

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const queryKey = new URL(request.url).searchParams.get("apiKey")?.trim() ?? null;
  const provided = bearer || queryKey;

  if (provided !== expected) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401, headers: chartfmStoreCorsHeaders(request) },
    );
  }
  return null;
}

export function chartfmStoreCorsHeaders(request: Request): HeadersInit {
  const origins = (process.env.CHARTFM_STORE_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return { "Access-Control-Allow-Origin": "*" };
  }

  const requestOrigin = request.headers.get("origin");
  const allowed =
    requestOrigin && origins.includes(requestOrigin) ? requestOrigin : origins[0]!;

  return {
    "Access-Control-Allow-Origin": allowed,
    Vary: "Origin",
  };
}

export function chartfmStoreOptionsResponse(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...chartfmStoreCorsHeaders(request),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
