import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serve os arquivos de MEDIA_ROOT em dev/self-host simples. Em produção
 * atrás de Nginx, prefira servir /midia direto do disco por lá e remover
 * esta rota do tráfego (só existe para não depender de infra extra em dev).
 */
const RAIZ_MIDIA = process.env.MEDIA_ROOT ?? path.join(process.cwd(), ".midia");

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ caminho: string[] }> }) {
  const { caminho } = await params;

  // Bloqueia ".." pra não escapar de MEDIA_ROOT.
  if (caminho.some((parte) => parte.includes(".."))) {
    return NextResponse.json({ erro: "Caminho inválido" }, { status: 400 });
  }

  const caminhoAbsoluto = path.join(/* turbopackIgnore: true */ RAIZ_MIDIA, ...caminho);

  try {
    const conteudo = await readFile(caminhoAbsoluto);
    const extensao = path.extname(caminhoAbsoluto).toLowerCase();
    return new NextResponse(new Uint8Array(conteudo), {
      headers: {
        "content-type": CONTENT_TYPES[extensao] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });
  }
}
