import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MEDIA_MAX_BYTES, imageTypeOf, saveImage } from "@/lib/media/storage";

/**
 * Upload de imagem do editor do blog: devolve a URL (vira ![alt](url) no markdown) e o
 * id (para usar como capa). GET lista a biblioteca, mais recentes primeiro.
 */
async function isAdmin() {
  return (await auth())?.user?.isAdmin === true;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Não autorizado" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Envie o arquivo como multipart/form-data." }, { status: 400 });
  }
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "").trim().slice(0, 200);
  if (!(file instanceof File)) return Response.json({ error: "Envie um arquivo no campo 'file'." }, { status: 400 });
  if (!imageTypeOf(file)) return Response.json({ error: `Tipo não aceito: ${file.type || file.name}. Use JPEG, PNG, WebP ou AVIF.` }, { status: 415 });
  if (file.size > MEDIA_MAX_BYTES) return Response.json({ error: "Arquivo acima de 25 MB." }, { status: 413 });

  try {
    const media = await saveImage({ buffer: Buffer.from(await file.arrayBuffer()), originalName: file.name, alt });
    return Response.json({ id: media.id, url: media.url, alt: media.alt, markdown: `![${media.alt ?? ""}](${media.url})` });
  } catch (error) {
    console.error("[midia] upload falhou:", error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao processar a imagem." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("pagina")) || 1);
  const pageSize = 40;
  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where: { mimeType: { startsWith: "image/" } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, url: true, alt: true, width: true, height: true },
    }),
    prisma.media.count({ where: { mimeType: { startsWith: "image/" } } }),
  ]);
  return Response.json({ items, total, page, pageSize });
}
