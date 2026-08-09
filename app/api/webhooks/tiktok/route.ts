import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/integrations/verify-webhook";
import { logger } from "@/lib/logging";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-tiktok-signature");

  const isValid = verifyHmacSignature(rawBody, signature, process.env.TIKTOK_CLIENT_SECRET);
  if (!isValid) {
    logger.warn("WEBHOOK", "TikTok: assinatura inválida, evento rejeitado");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // TODO: processar evento (ex.: atualização de pedido/afiliado) conforme payload do TikTok Shop.
  logger.info("WEBHOOK", "TikTok: evento recebido");

  return NextResponse.json({ ok: true });
}
