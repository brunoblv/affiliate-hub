import { NextResponse } from "next/server";
import { gerarArtigoECriarRascunhoLarSmart, regenerarArtigoLarSmart } from "@/app/admin/(dashboard)/posts/larsmart/servico";
import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";

export const maxDuration = 90;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    pauta?: PautaListaCasa;
    slugs?: string[];
    postId?: string;
  } | null;

  if (body?.postId) {
    const resultado = await regenerarArtigoLarSmart(body.postId);
    return NextResponse.json(resultado);
  }

  if (!body?.pauta || !body.slugs?.length) {
    return NextResponse.json({ ok: false, erro: "Pauta ou produtos ausentes." });
  }

  const resultado = await gerarArtigoECriarRascunhoLarSmart(body.pauta, body.slugs);
  return NextResponse.json(resultado);
}
