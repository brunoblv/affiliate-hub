import { verifyMetricToken, type MetricPayload } from "./token";

export async function ingestMetric(request: Request, persist: (event: MetricPayload) => Promise<void>, secret = process.env.AUTH_SECRET): Promise<Response> {
  const response = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(403);
  if (!request.headers.get("content-type")?.startsWith("text/plain")) return response(415);
  if (Number(request.headers.get("content-length")) > 2000) return response(413);
  const reader = request.body?.getReader();
  if (!reader) return response(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2000) { await reader.cancel(); return response(413); }
      chunks.push(value);
    }
  } catch { return response(400); }
  const event = verifyMetricToken(Buffer.concat(chunks).toString("utf8"), secret);
  if (!event) return response(400);
  try { await persist(event); } catch { return response(503); }
  return response(204);
}
