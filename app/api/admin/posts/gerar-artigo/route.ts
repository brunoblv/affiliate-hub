import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ehCategoriaEditorial, ehTemaEditorial, gerarArtigo } from "@/app/admin/(dashboard)/posts/gerar/servico";

export const maxDuration = 60;

export async function POST(requisicao: Request) {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });

  const corpo = (await requisicao.json().catch(() => null)) as { categoria?: unknown; tema?: unknown } | null;
  if (!ehCategoriaEditorial(corpo?.categoria) || !ehTemaEditorial(corpo?.tema)) {
    return NextResponse.json({ ok: false, erro: "Pedido inválido." }, { status: 400 });
  }

  const resultado = await gerarArtigo(corpo.categoria, corpo.tema);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}
