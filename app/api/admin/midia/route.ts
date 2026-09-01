import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { ehArquivoEnviado, TAMANHO_MAXIMO_MIDIA, tipoDeImagem } from "@/lib/midia/constantes";
import { salvarArquivoDeMidia } from "@/lib/midia/salvar";

/**
 * Upload de imagem do CMS. O editor chama isto ao anexar um arquivo e recebe
 * de volta a URL, que vira ![alt](url) no markdown do post — ou o id da capa.
 */

export async function POST(requisicao: Request) {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const formulario = await requisicao.formData();
    const arquivo = formulario.get("arquivo");
    const alt = String(formulario.get("alt") ?? "").trim();

    if (!ehArquivoEnviado(arquivo)) {
      return NextResponse.json({ erro: "Envie um arquivo no campo 'arquivo'." }, { status: 400 });
    }

    if (!tipoDeImagem(arquivo)) {
      return NextResponse.json(
        { erro: `Tipo não aceito: ${arquivo.type || arquivo.name}. Use JPEG, PNG, WebP ou AVIF.` },
        { status: 415 },
      );
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
      id: midia.id,
      url: midia.url,
      alt: midia.alt,
      markdown: `![${midia.alt ?? ""}](${midia.url})`,
    });
  } catch (erro) {
    console.error("Upload de mídia falhou:", erro);
    return NextResponse.json({ erro: mensagemErroUpload(erro) }, { status: 500 });
  }
}

function mensagemErroUpload(erro: unknown): string {
  const codigo = erro && typeof erro === "object" && "code" in erro ? String((erro as { code: unknown }).code) : "";
  if (codigo === "ECONNREFUSED" || codigo === "P1001" || codigo === "P1017") {
    return "Não foi possível gravar a mídia: banco de dados indisponível.";
  }
  if (codigo === "P2002") {
    return "Falha ao gravar a mídia (conflito). Tente enviar de novo.";
  }
  if (erro instanceof Error && erro.message && !erro.message.startsWith("Invalid `prisma")) {
    return erro.message;
  }
  return "Falha ao processar a imagem.";
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
