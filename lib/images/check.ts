import { prisma } from "@/lib/db";
import { safeFetch, UnsafeUrlError, type SafeFetchDeps } from "@/lib/net/safe-fetch";

export type ImageCheck = { ok: true } | { ok: false; reason: string };

/** Reconhece imagem pelos primeiros bytes: o Content-Type de CDN nem sempre é confiável. */
export function looksLikeImage(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  const head = bytes.subarray(0, 12);
  return (
    (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) || // jpeg
    head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) || // png
    head.subarray(0, 4).toString("ascii") === "GIF8" ||
    (head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") ||
    head.subarray(4, 8).toString("ascii") === "ftyp" // avif/heic
  );
}

/** A URL responde com uma imagem de verdade? Baixa só o começo do arquivo. */
export async function checkImageUrl(url: string, deps: Partial<SafeFetchDeps> = {}): Promise<ImageCheck> {
  try {
    const response = await safeFetch(url, { timeoutMs: 8000, stopAfterBytes: 4096, headers: { range: "bytes=0-4095" } }, deps);
    if (response.status !== 200 && response.status !== 206) return { ok: false, reason: `A URL respondeu ${response.status}.` };
    if (!looksLikeImage(response.body)) return { ok: false, reason: "A URL não devolve uma imagem." };
    return { ok: true };
  } catch (error) {
    if (error instanceof UnsafeUrlError) return { ok: false, reason: error.message };
    return { ok: false, reason: "Não foi possível acessar a URL." };
  }
}

const HOUR = 60 * 60 * 1000;

/**
 * Confere as fotos cadastradas: as boas a cada 24 h e as quebradas a cada hora (o problema
 * pode ser passageiro). Foto quebrada some do site; a página continua normal (RF-14).
 */
export async function verifyImages(limit = 40, deps: Partial<SafeFetchDeps> = {}, now = new Date()) {
  const images = await prisma.productImage.findMany({
    where: {
      OR: [
        { verifiedAt: null },
        { broken: false, verifiedAt: { lt: new Date(now.getTime() - 24 * HOUR) } },
        { broken: true, verifiedAt: { lt: new Date(now.getTime() - HOUR) } },
      ],
    },
    orderBy: { verifiedAt: { sort: "asc", nulls: "first" } },
    take: limit,
  });

  let broken = 0;
  for (const image of images) {
    const result = await checkImageUrl(image.url, deps);
    if (!result.ok) broken++;
    await prisma.productImage.update({ where: { id: image.id }, data: { broken: !result.ok, verifiedAt: now } });
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { checked: images.length, broken };
}
