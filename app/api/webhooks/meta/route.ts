import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/integrations/verify-webhook";
import { logger } from "@/lib/logging";

/** Verificação inicial do webhook (Meta chama com hub.challenge). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Verificação falhou" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");
  const signature = signatureHeader?.replace("sha256=", "") ?? null;

  const isValid = verifyHmacSignature(rawBody, signature, process.env.META_APP_SECRET);
  if (!isValid) {
    logger.warn("WEBHOOK", "Meta: assinatura inválida, evento rejeitado");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // TODO: processar eventos (comentários, insights, status de publicação) da Graph API.
  logger.info("WEBHOOK", "Meta: evento recebido");

  return NextResponse.json({ ok: true });
}
