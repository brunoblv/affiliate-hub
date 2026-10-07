import path from "node:path";
import { CONTENT_TYPES, readMediaFile } from "@/lib/media/storage";

/**
 * Entrega os arquivos de MEDIA_DIR (imagens dos blogs). Em produção o nginx
 * pode servir /midia direto do disco; esta rota cobre dev e o caso sem configuração extra.
 */
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const parts = (await context.params).path;
  if (parts.some((part) => part === ".." || part.includes("\\") || part.includes("\0"))) {
    return new Response("Caminho inválido", { status: 400 });
  }

  const relative = parts.join("/");
  const file = await readMediaFile(relative);
  if (!file) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": CONTENT_TYPES[path.extname(relative).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
