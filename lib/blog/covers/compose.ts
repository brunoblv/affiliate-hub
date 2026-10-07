import { existsSync } from "node:fs";
import sharp, { type OverlayOptions } from "sharp";
import { safeFetch } from "@/lib/net/safe-fetch";
import { readMediaFile } from "@/lib/media/storage";
import { blogContentPath } from "@/lib/blog/ai/prompts";

/**
 * Capa do blog (1600×900): fundo de marca em content/blogs/<sub>/fundos/capa/<tipo>/N.png
 * com a cena (IA) recortada por dentro, como moldura. Sem cena, cai na composição local:
 * fundo + foto do produto em tela cheia + título sobre véu escuro.
 */
export type CoverKind = "jornada" | "lista" | "produto";

export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 900;
const VARIANTS = ["1.png", "2.png", "3.png"];

/** Mesma semente, mesma variante de fundo. */
export function pickVariant(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return VARIANTS[hash % VARIANTS.length]!;
}

function backgroundPath(subdomain: string, kind: CoverKind, file: string): string | null {
  const full = blogContentPath(subdomain, "fundos", "capa", kind, file);
  return existsSync(full) ? full : null;
}

const UA = "Mozilla/5.0 (compatible; CapibuscaBot/1.0; +https://capibusca.com.br)";

/** Bytes de uma foto: /midia local sem HTTP; URL externa só se for pública (anti-SSRF). */
export async function imageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("/midia/")) {
    const file = await readMediaFile(url.slice("/midia/".length));
    if (!file) throw new Error(`Mídia não encontrada: ${url}`);
    return file;
  }
  const response = await safeFetch(url, { timeoutMs: 15_000, maxBytes: 12 * 1024 * 1024, headers: { "user-agent": UA, accept: "image/*" } });
  if (response.status !== 200) throw new Error(`Falha ao baixar imagem (${response.status}).`);
  return response.body;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Quebra estimada (não há medição real de fonte no servidor), no máximo 3 linhas. */
function wrap(text: string, maxWidth: number, fontSize: number, maxLines = 3): string[] {
  const estimate = (value: string) => value.length * fontSize * 0.62;
  const lines: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/)) {
    const attempt = current ? `${current} ${word}` : word;
    if (!current || estimate(attempt) <= maxWidth) {
      current = attempt;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (text.trim().length > lines.join(" ").length && lines.length === maxLines) {
    let last = lines[maxLines - 1]!;
    while (last.length > 1 && estimate(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function titleOverlay(title: string, headingFont: string): Buffer {
  const fontSize = Math.round(50 * (COVER_HEIGHT / 1080));
  const x = 0.06 * COVER_WIDTH;
  const lines = wrap(title, 0.84 * COVER_WIDTH, fontSize);
  const lineHeight = Math.round(fontSize * 1.22);
  const baseline = COVER_HEIGHT * 0.94 - (lines.length - 1) * lineHeight;
  const tspans = lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("");
  return Buffer.from(`<svg width="${COVER_WIDTH}" height="${COVER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="v" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.7"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/></linearGradient></defs>
    <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#v)"/>
    <text x="${x}" y="${baseline}" font-family="${escapeXml(headingFont)}" font-weight="600" font-size="${fontSize}" fill="#ffffff">${tspans}</text>
  </svg>`);
}

/** Recorte retangular com cantos arredondados, em % da capa. */
async function inset(image: Buffer, box: { x: number; y: number; w: number; h: number; radius: number }): Promise<OverlayOptions> {
  const width = Math.round(box.w * COVER_WIDTH);
  const height = Math.round(box.h * COVER_HEIGHT);
  const radius = Math.round(box.radius * COVER_WIDTH);
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
  const input = await sharp(image).resize(width, height, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return { input, left: Math.round(box.x * COVER_WIDTH), top: Math.round(box.y * COVER_HEIGHT) };
}

async function background(subdomain: string, kind: CoverKind, file: string): Promise<Buffer | null> {
  const path = backgroundPath(subdomain, kind, file);
  if (!path) return null;
  return sharp(path).resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover" }).toBuffer();
}

/** Cena da IA recuada 4% dentro da moldura. null se o blog não tem fundo para esse tipo. */
export async function composeWithScene(subdomain: string, kind: CoverKind, variant: string, scene: Buffer): Promise<Buffer | null> {
  const base = await background(subdomain, kind, variant);
  if (!base) return null;
  const photo = await inset(scene, { x: 0.04, y: 0.04, w: 0.92, h: 0.92, radius: 0.012 });
  return sharp(base).composite([photo]).png().toBuffer();
}

/** Plano B sem IA: fundo + foto (se houver) em tela cheia + título. */
export async function composeLocal(
  subdomain: string,
  kind: CoverKind,
  variant: string,
  title: string,
  photoUrl: string | null,
  headingFont: string,
): Promise<Buffer | null> {
  const base = await background(subdomain, kind, variant);
  if (!base) return null;
  const layers: OverlayOptions[] = [];
  if (photoUrl) {
    try {
      layers.push(await inset(await imageBuffer(photoUrl), { x: 0, y: 0, w: 1, h: 1, radius: 0 }));
    } catch {
      // Foto indisponível: a capa sai só com fundo e título.
    }
  }
  layers.push({ input: titleOverlay(title, headingFont), left: 0, top: 0 });
  return sharp(base).composite(layers).png().toBuffer();
}
