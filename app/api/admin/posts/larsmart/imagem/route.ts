import { NextResponse } from "next/server";
import { gerarImagemLarSmart } from "@/app/admin/(dashboard)/posts/larsmart/servico";
import type { AlvoImagemLarSmart } from "@/app/admin/(dashboard)/posts/larsmart/tipos";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { postId?: string; alvo?: AlvoImagemLarSmart } | null;
  if (!body?.postId || !body.alvo) {
    return NextResponse.json({ ok: false, erro: "Post ou alvo da imagem ausente." });
  }
  const resultado = await gerarImagemLarSmart(body.postId, body.alvo);
  return NextResponse.json(resultado);
}
