import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readCreativeFile } from "@/lib/creatives/storage";

/**
 * Entrega o arquivo de uma capa, só para admin (o arquivo não fica em pasta pública).
 * `?baixar=1` força o download com um nome legível.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) return new Response("Não autorizado", { status: 401 });

  const { id } = await context.params;
  const creative = await prisma.creative.findUnique({ where: { id }, include: { product: { select: { slug: true } } } });
  if (!creative) return new Response("Não encontrado", { status: 404 });

  const file = await readCreativeFile(creative.file);
  if (!file) return new Response("Arquivo indisponível", { status: 404 });

  const download = new URL(request.url).searchParams.get("baixar") === "1";
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, no-store",
      ...(download ? { "content-disposition": `attachment; filename="${creative.product.slug}-${creative.format}.jpg"` } : {}),
    },
  });
}
