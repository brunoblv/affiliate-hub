import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/integrations/verify-webhook";
import { logger } from "@/lib/logging";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-shopee-signature");

  const isValid = verifyHmacSignature(rawBody, signature, process.env.SHOPEE_SECRET);
  if (!isValid) {
    logger.warn("WEBHOOK", "Shopee: assinatura inválida, evento rejeitado");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // TODO: processar evento (ex.: atualização de pedido/comissão) conforme payload da Shopee.
  logger.info("WEBHOOK", "Shopee: evento recebido");

  return NextResponse.json({ ok: true });
}
