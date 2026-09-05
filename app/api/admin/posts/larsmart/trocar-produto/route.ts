import { NextResponse } from "next/server";
import { trocarProdutoLarSmart } from "@/app/admin/(dashboard)/posts/larsmart/servico";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { postId?: string; slugAntigo?: string } | null;
  if (!body?.postId || !body.slugAntigo) {
    return NextResponse.json({ ok: false, erro: "Dados incompletos pra trocar o produto." });
  }
  const resultado = await trocarProdutoLarSmart(body.postId, body.slugAntigo);
  return NextResponse.json(resultado);
}
