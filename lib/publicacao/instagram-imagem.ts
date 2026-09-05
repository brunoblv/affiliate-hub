import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resolverBufferDeImagem } from "@/lib/artes/foto";
import { RAIZ_MIDIA } from "@/lib/midia/salvar";
import { getSiteUrl, urlPublica } from "@/lib/site-url";

/** Teto da Content Publishing API. */
const LIMITE_LEGENDA_INSTAGRAM = 2200;
/** Instagram só aceita JPEG; proporção entre 4:5 e 1.91:1; largura 320–1440. */
const LADO = 1080;
const RATIO_MIN = 4 / 5;
const RATIO_MAX = 1.91;

function pastaDoMes(agora = new Date()): string {
  return path.join(String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"));
}

function ehHttpsPublico(url: string): boolean {
  return /^https:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url);
}

function jaEJpegNosso(url: string): boolean {
  const site = getSiteUrl();
  return ehHttpsPublico(url) && url.startsWith(site) && /\.jpe?g(\?|#|$)/i.test(url);
}

function caminhoLocalSeNosso(url: string): string | undefined {
  const site = getSiteUrl();
  if (url.startsWith(site)) {
    const caminho = url.slice(site.length);
    return caminho.startsWith("/") ? caminho : `/${caminho}`;
  }
  try {
    const pathname = new URL(url).pathname;
    if (pathname.startsWith("/midia/") || pathname.startsWith("/hero-")) return pathname;
  } catch {
    /* URL relativa ou inválida — cai no resolver genérico. */
  }
  return undefined;
}

async function jpegNoSpecInstagram(buffer: Buffer): Promise<Buffer> {
  const orientado = await sharp(buffer).rotate().toBuffer();
  const { width = LADO, height = LADO, hasAlpha } = await sharp(orientado).metadata();
  const ratio = width / height;

  let img = sharp(orientado);
  if (ratio < RATIO_MIN || ratio > RATIO_MAX) {
    img = img.resize(LADO, LADO, { fit: "cover", position: "attention" });
  } else if (width < 320 || width > 1440) {
    img = img.resize({ width: Math.min(1440, Math.max(LADO, 320)) });
  }

  if (hasAlpha) img = img.flatten({ background: "#ffffff" });
  return img.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

async function salvarJpegInstagram(buffer: Buffer): Promise<string> {
  const pasta = path.join("artes", "instagram", pastaDoMes());
  const nomeArquivo = `${randomBytes(6).toString("hex")}.jpg`;
  const caminhoRelativo = path.join(pasta, nomeArquivo);
  const caminhoAbsoluto = path.join(RAIZ_MIDIA, caminhoRelativo);

  await mkdir(path.dirname(caminhoAbsoluto), { recursive: true });
  await writeFile(caminhoAbsoluto, buffer);

  return `/midia/${caminhoRelativo.split(path.sep).join("/")}`;
}

/**
 * A Content Publishing API só busca JPEG em HTTPS público. Artes do hub e
 * fotos de marketplace entram como WebP — a Meta recusa com 36001/2207005.
 * Converte e republica em /midia para a Meta conseguir baixar.
 */
export async function urlJpegPublicaParaInstagram(imagemUrl: string): Promise<string> {
  if (jaEJpegNosso(imagemUrl)) return imagemUrl;

  const origem = caminhoLocalSeNosso(imagemUrl) ?? imagemUrl;
  const bruto = await resolverBufferDeImagem(origem);
  const jpeg = await jpegNoSpecInstagram(bruto);
  const relativa = await salvarJpegInstagram(jpeg);
  const publica = urlPublica(relativa);

  if (!publica || !ehHttpsPublico(publica)) {
    throw new Error(
      "Instagram só busca imagem em HTTPS público. Confira NEXT_PUBLIC_SITE_URL no servidor.",
    );
  }

  return publica;
}

export function legendaInstagram(texto: string): string {
  if (texto.length <= LIMITE_LEGENDA_INSTAGRAM) return texto;
  return `${texto.slice(0, LIMITE_LEGENDA_INSTAGRAM - 1).trimEnd()}…`;
}
