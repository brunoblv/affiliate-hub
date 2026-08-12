import { NextResponse } from "next/server";
import { getChartfmStoreGoTarget } from "@/lib/chartfm-store";
import {
  assertChartfmStoreApiAccess,
  chartfmStoreCorsHeaders,
  chartfmStoreOptionsResponse,
} from "@/lib/chartfm-store-api";

/**
 * Resolve o link de compra de um produto do catálogo ChartFM.
 *
 * GET /api/public/chartfm/products/[id]/go
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = assertChartfmStoreApiAccess(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const target = await getChartfmStoreGoTarget(id);
  if (!target) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404, headers: chartfmStoreCorsHeaders(request) },
    );
  }

  return NextResponse.json(target, {
    headers: {
      ...chartfmStoreCorsHeaders(request),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function OPTIONS(request: Request) {
  return chartfmStoreOptionsResponse(request);
}
