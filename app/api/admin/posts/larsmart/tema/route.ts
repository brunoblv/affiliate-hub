import { NextResponse } from "next/server";
import { gerarTemaLarSmart } from "@/app/admin/(dashboard)/posts/larsmart/servico";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { topico?: string } | null;
  const topico = body?.topico?.trim();
  if (!topico) {
    return NextResponse.json({ ok: false, erro: "Digite uma ideia de artigo." });
  }
  const resultado = await gerarTemaLarSmart(topico);
  return NextResponse.json(resultado);
}
