import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pautaListaPorId } from "@/lib/conteudo/pauta-listas-casa";
import { gerarESalvarLista, gerarLista } from "@/app/admin/(dashboard)/posts/gerar-lista/servico";

export const maxDuration = 60;

export async function POST(requisicao: Request) {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });

  const corpo = (await requisicao.json().catch(() => null)) as {
    pautaId?: unknown;
    salvar?: unknown;
    distribuir?: unknown;
  } | null;

  const pautaId = typeof corpo?.pautaId === "string" ? corpo.pautaId : "";
  if (!pautaListaPorId(pautaId)) {
    return NextResponse.json({ ok: false, erro: "Pauta inválida." }, { status: 400 });
  }

  if (corpo?.salvar === true) {
    const resultado = await gerarESalvarLista(pautaId, corpo.distribuir === true);
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
  }

  const resultado = await gerarLista(pautaId);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}
