import { prisma } from "@/lib/db";
import { ingestMetric } from "@/lib/metrics/ingest";

export async function POST(request: Request) {
  return ingestMetric(request, async (event) => {
    // ID assinado e único: repetir entrega/StrictMode não duplica o evento.
    await prisma.metricEvent.createMany({ skipDuplicates: true, data: [{
      id: event.id, kind: event.kind, nicheId: event.nicheId,
      productId: event.kind === "PRODUCT_VIEW" ? event.productId : null,
      term: event.kind === "SEARCH" ? event.term : null,
      resultCount: event.kind === "SEARCH" ? event.resultCount : null,
    }] });
  });
}
