import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

/**
 * Biblioteca de mídia dos blogs. Arquivos ficam fora de public/ (MEDIA_DIR) e saem por
 * /midia/[...path], para não exigir rebuild a cada upload. Em produção, aponte MEDIA_DIR
 * para um volume persistente (o nginx também pode servir /midia direto dessa pasta).
 */
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const MEDIA_MAX_WIDTH = 1600;
export const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".wav": "audio/wav",
};

export const mediaRoot = () =>
  path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "media"));

/** Caminho absoluto de um arquivo dentro de MEDIA_DIR; null se tentar sair da pasta. */
export function mediaFilePath(relative: string): string | null {
  const root = mediaRoot();
  const absolute = path.resolve(root, relative);
  return absolute.startsWith(root + path.sep) ? absolute : null;
}

/** MIME real ou, quando o navegador manda vazio (Windows), pela extensão. */
export function imageTypeOf(file: { type: string; name: string }): string | null {
  if (file.type === "image/jpg") return "image/jpeg";
  if (ACCEPTED_IMAGE_TYPES.has(file.type)) return file.type;
  return TYPE_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

function monthFolder(now = new Date()): string {
  return path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
}

async function writeMediaFile(baseName: string, extension: string, data: Buffer) {
  const base = slugify(path.parse(baseName).name).slice(0, 60) || "arquivo";
  const relative = path.join(monthFolder(), `${base}-${randomBytes(4).toString("hex")}.${extension}`);
  const absolute = path.join(mediaRoot(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, data);
  return { relative, url: `/midia/${relative.split(path.sep).join("/")}` };
}

function imageError(error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  if (/unsupported image format|Input buffer/i.test(detail)) return new Error("Não foi possível ler a imagem. Use JPEG, PNG, WebP ou AVIF.");
  if (/pixel limit|too large/i.test(detail)) return new Error("A imagem tem resolução grande demais. Reduza e tente de novo.");
  return new Error("Falha ao processar a imagem.");
}

/** Redimensiona (até 1600px), converte para WebP e registra na biblioteca. */
export async function saveImage(input: { buffer: Buffer; originalName: string; alt?: string | null; quality?: number }) {
  let data: Buffer;
  let meta: { width?: number; height?: number };
  try {
    const pipeline = sharp(input.buffer).rotate().resize({ width: MEDIA_MAX_WIDTH, withoutEnlargement: true });
    data = await pipeline.clone().webp({ quality: input.quality ?? 82 }).toBuffer();
    meta = await sharp(data).metadata();
  } catch (error) {
    throw imageError(error);
  }
  const file = await writeMediaFile(input.originalName, "webp", data);
  return prisma.media.create({
    data: {
      url: file.url,
      path: file.relative,
      originalName: input.originalName,
      mimeType: "image/webp",
      sizeBytes: data.byteLength,
      width: meta.width ?? null,
      height: meta.height ?? null,
      alt: input.alt?.trim() || null,
    },
  });
}

export async function readMediaFile(relative: string): Promise<Buffer | null> {
  const absolute = mediaFilePath(relative);
  if (!absolute) return null;
  return readFile(absolute).catch(() => null);
}

/** Apaga arquivo e registro, só se nenhum post ainda usa a mídia como capa, áudio ou no corpo. */
export async function deleteMediaIfUnused(mediaId: string): Promise<boolean> {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { _count: { select: { coverOf: true, audioOf: true, usedIn: true, larsmartImages: true } } },
  });
  if (!media) return false;
  const { coverOf, audioOf, usedIn, larsmartImages } = media._count;
  if (coverOf + audioOf + usedIn + larsmartImages > 0) return false;
  const absolute = mediaFilePath(media.path);
  if (absolute) await unlink(absolute).catch(() => undefined);
  await prisma.media.delete({ where: { id: mediaId } }).catch(() => undefined);
  return true;
}
