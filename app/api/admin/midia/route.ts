import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import {
  salvarArquivoDeMidia,
  TAMANHO_MAXIMO_MIDIA,
  TIPOS_ACEITOS_MIDIA,
} from "@/lib/midia/salvar";

/**
 * Upload de imagem do CMS. O editor chama isto ao anexar um arquivo e recebe
 * de volta a URL, que vira ![alt](url) no markdown do post — ou o id da capa.
 */

export async function POST(requisicao: Request) {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const formulario = await requisicao.formData();
  const arquivo = formulario.get("arquivo");
  const alt = String(formulario.get("alt") ?? "").trim();

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo no campo 'arquivo'." }, { status: 400 });
  }

  if (!TIPOS_ACEITOS_MIDIA.has(arquivo.type)) {
    return NextResponse.json({ erro: `Tipo não aceito: ${arquivo.type}` }, { status: 415 });
  }

  if (arquivo.size > TAMANHO_MAXIMO_MIDIA) {
    return NextResponse.json({ erro: "Arquivo acima de 25 MB." }, { status: 413 });
  }

  const midia = await salvarArquivoDeMidia({
    buffer: Buffer.from(await arquivo.arrayBuffer()),
    nomeOriginal: arquivo.name,
    alt,
  });

  return NextResponse.json({
    ...midia,
    markdown: `![${midia.alt ?? ""}](${midia.url})`,
  });
}

export async function GET(requisicao: Request) {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(requisicao.url);
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? 1));
  const porPagina = 40;

  const [itens, total] = await Promise.all([
    prisma.midia.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.midia.count(),
  ]);

  return NextResponse.json({ itens, total, pagina, porPagina });
}
