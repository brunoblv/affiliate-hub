import { NextResponse } from "next/server";
import {
  getChartfmStoreListing,
  clampPageSize,
} from "@/lib/chartfm-store";
import {
  assertChartfmStoreApiAccess,
  chartfmStoreCorsHeaders,
  chartfmStoreOptionsResponse,
} from "@/lib/chartfm-store-api";

/**
 * Catálogo público da Loja ChartFM.
 *
 * GET /api/public/chartfm/products?categoria=chartfm-vinis&pagina=1&limit=24
 *
 * Filtra pelo AffiliateProject `chartfm` (não por uma Category chamada chartfm).
 * Se `CHARTFM_STORE_API_KEY` estiver definida, exige
 * `Authorization: Bearer <chave>` ou `?apiKey=<chave>`.
 */
export async function GET(request: Request) {
  const unauthorized = assertChartfmStoreApiAccess(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("categoria")?.trim() || undefined;
  const pageRaw = Number(searchParams.get("pagina") ?? "1");
  const limitRaw = Number(searchParams.get("limit") ?? "");

  const listing = await getChartfmStoreListing({
    categorySlug,
    page: Number.isFinite(pageRaw) ? pageRaw : 1,
    pageSize: clampPageSize(Number.isFinite(limitRaw) ? limitRaw : undefined),
  });

  if (!listing) {
    return NextResponse.json(
      { error: "Projeto chartfm não encontrado ou inativo." },
      {
        status: 404,
        headers: {
          ...chartfmStoreCorsHeaders(request),
          "Cache-Control": "public, s-maxage=60",
        },
      },
    );
  }

  return NextResponse.json(listing, {
    headers: {
      ...chartfmStoreCorsHeaders(request),
      // Catálogo muda com descoberta/import; 5 min bate com o cache da Loja no ChartFM.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}

export async function OPTIONS(request: Request) {
  return chartfmStoreOptionsResponse(request);
}
