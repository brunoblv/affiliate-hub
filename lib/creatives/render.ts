import sharp from "sharp";
import { money } from "@/lib/format";

/**
 * Composição determinística das capas (RF-15): foto real do produto + identidade do Hub +
 * nome curto + nicho + chamada. Nada de IA no produto: rótulo, cor e modelo saem da foto original.
 * Sem selo de desconto: só há preço quando ele é informado, sempre datado e com a condição.
 */

export const TEMPLATE = "produto-claro";
export const TEMPLATE_VERSION = 1;

export const FORMATS = {
  share: { label: "Compartilhamento (1200×630)", width: 1200, height: 630 },
  feed: { label: "Feed (1080×1350)", width: 1080, height: 1350 },
  story: { label: "Stories (1080×1920)", width: 1080, height: 1920 },
  square: { label: "Quadrado (1080×1080)", width: 1080, height: 1080 },
} as const;

export type FormatKey = keyof typeof FORMATS;
export const FORMAT_KEYS = Object.keys(FORMATS) as FormatKey[];

const BRAND = "#5B5CE2";
const BRAND_DARK = "#3E3FB8";
const BRAND_SOFT = "#EEEEFF";
const INK = "#17212B";
const MUTED = "#5B6573";
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, 'Liberation Sans', 'DejaVu Sans', sans-serif";

export interface CreativeInput {
  photo: Buffer;
  name: string;
  brand: string | null;
  nicheName: string | null;
  format: FormatKey;
  /** Só quando a capa mostra preço: valor e instante da observação. */
  price?: { cents: number; observedAt: Date };
}

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Quebra o texto em linhas por largura estimada (sem métrica exata da fonte: ~0,58 em por caractere, folga para larguras maiores). */
export function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const perLine = Math.max(6, Math.floor(maxWidth / (fontSize * 0.58)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= perLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > perLine ? `${word.slice(0, perLine - 1)}…` : word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    // Reticências sempre depois de uma palavra inteira, nunca no meio dela.
    let last = kept[maxLines - 1].replace(/[.,;:…]*$/, "");
    while (last.length + 1 > perLine && last.includes(" ")) last = last.slice(0, last.lastIndexOf(" "));
    kept[maxLines - 1] = `${last.slice(0, perLine - 1)}…`;
    return kept;
  }
  return lines;
}

const dateBr = (date: Date) => date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Tamanhos de texto de um plano, todos derivados de um fator de escala. */
interface Sizes {
  brand: number;
  name: number;
  price: number;
  note: number;
  cta: number;
}

const sizesFor = (s: number): Sizes => ({
  brand: Math.round(28 * s),
  name: Math.round(64 * s),
  price: Math.round(92 * s),
  note: Math.round(28 * s),
  cta: Math.round(92 * s),
});

interface Plan {
  W: number;
  H: number;
  pad: number;
  photo: Box;
  text: { x: number; w: number; top: number };
  horizontal: boolean;
  sizes: Sizes;
  nameLines: string[];
  scale: number;
}

const nameStep = (size: number) => Math.round(size * 1.18);

/**
 * Formatos verticais: primeiro mede o bloco de texto (marca, nome, preço, botão) e só então
 * dá o espaço que sobra à foto. Se a foto ficaria pequena demais, reduz o texto e tenta de novo.
 */
function plan(input: CreativeInput): Plan {
  const { width: W, height: H } = FORMATS[input.format];
  const pad = Math.round(Math.min(W, H) * 0.06);

  if (input.format === "share") {
    // Paisagem: foto à esquerda, texto à direita.
    const photo: Box = { x: pad, y: pad + 46, w: H - pad * 2 - 46, h: H - pad * 2 - 46 };
    const textX = photo.x + photo.w + pad;
    const scale = 0.62;
    const sizes = sizesFor(scale);
    sizes.name = Math.round(58 * scale + 6);
    sizes.price = Math.round(84 * scale + 8);
    sizes.note = Math.round(24 * scale + 6);
    sizes.brand = Math.round(24 * scale + 4);
    sizes.cta = Math.round(70 * scale + 22);
    const textW = W - textX - pad;
    return { W, H, pad, photo, text: { x: textX, w: textW, top: photo.y }, horizontal: true, sizes, nameLines: wrapText(input.name, sizes.name, textW, 3), scale };
  }

  const headerH = 84;
  const photoTop = pad + headerH;
  const gap = 30;
  const minPhoto = 400;
  const textW = W - pad * 2;
  let best: Plan | null = null;

  for (const scale of [1, 0.92, 0.84, 0.76, 0.68]) {
    for (const maxLines of [3, 2]) {
      const sizes = sizesFor(scale);
      const nameLines = wrapText(input.name, sizes.name, textW, maxLines);
      const textH =
        (input.brand ? sizes.brand + 16 : 0) +
        nameLines.length * nameStep(sizes.name) +
        24 +
        (input.price ? Math.round(sizes.price * 0.9 + sizes.note * 2 + 44) : 0) +
        gap +
        sizes.cta;
      const room = H - pad - textH - gap - photoTop;
      const photoH = Math.min(room, 1000);
      const candidate: Plan = {
        W, H, pad, horizontal: false, sizes, nameLines, scale,
        photo: { x: pad, y: photoTop, w: textW, h: Math.max(photoH, 200) },
        text: { x: pad, w: textW, top: photoTop + Math.max(photoH, 200) + gap },
      };
      best = candidate;
      if (room >= minPhoto) return candidate;
    }
  }
  return best!;
}

export async function renderCreative(input: CreativeInput): Promise<Buffer> {
  const L = plan(input);
  const { W, H, pad, photo, text, sizes, nameLines, scale } = L;

  // ---- foto: contida na caixa, sem cortar nem distorcer ----
  const inner = 24;
  const photoBuffer = await sharp(input.photo, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: photo.w - inner * 2, height: photo.h - inner * 2, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  const meta = await sharp(photoBuffer).metadata();
  const photoLeft = Math.round(photo.x + (photo.w - (meta.width ?? 0)) / 2);
  const photoTop = Math.round(photo.y + (photo.h - (meta.height ?? 0)) / 2);

  // ---- camada de fundo: cartão da foto ----
  const shapes = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#F7F8FA"/>
    <rect x="${photo.x}" y="${photo.y}" width="${photo.w}" height="${photo.h}" rx="${Math.round(28 * scale + 6)}" fill="#FFFFFF" stroke="#E6E8EC" stroke-width="2"/>
  </svg>`;

  // ---- camada de texto ----
  const parts: string[] = [];

  // Marca do Hub (canto superior esquerdo)
  const logo = Math.round(40 * Math.max(scale, 0.9) + 6);
  const logoY = pad - 4;
  parts.push(
    `<rect x="${pad}" y="${logoY}" width="${logo}" height="${logo}" rx="${Math.round(logo * 0.3)}" fill="${BRAND}"/>`,
    `<circle cx="${pad + logo * 0.45}" cy="${logoY + logo * 0.45}" r="${logo * 0.2}" fill="none" stroke="#fff" stroke-width="${Math.max(2, logo * 0.07)}"/>`,
    `<line x1="${pad + logo * 0.6}" y1="${logoY + logo * 0.6}" x2="${pad + logo * 0.76}" y2="${logoY + logo * 0.76}" stroke="#fff" stroke-width="${Math.max(2, logo * 0.07)}" stroke-linecap="round"/>`,
    `<text x="${pad + logo + 14}" y="${logoY + logo * 0.72}" font-family="${FONT}" font-size="${Math.round(logo * 0.62)}" font-weight="700" fill="${INK}">Affiliate<tspan fill="${BRAND}">Hub</tspan></text>`,
  );

  let cursor = text.top;

  // Nicho (chip): no canto superior direito nos verticais; acima do nome na paisagem
  if (input.nicheName) {
    const chipSize = Math.round(26 * Math.max(scale, 0.8) + 6);
    const label = input.nicheName.length > 26 ? `${input.nicheName.slice(0, 25)}…` : input.nicheName;
    const chipW = Math.round(label.length * chipSize * 0.56 + chipSize * 1.6);
    const chipH = Math.round(chipSize * 1.9);
    const chipY = L.horizontal ? cursor - 4 : logoY + (logo - chipH) / 2;
    const chipX = L.horizontal ? text.x : W - pad - chipW;
    parts.push(
      `<rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}" rx="${chipH / 2}" fill="${BRAND_SOFT}"/>`,
      `<text x="${chipX + chipW / 2}" y="${chipY + chipH * 0.68}" text-anchor="middle" font-family="${FONT}" font-size="${chipSize}" font-weight="600" fill="${BRAND_DARK}">${escapeXml(label)}</text>`,
    );
    if (L.horizontal) cursor += chipH + 26;
  }

  // Marca do produto
  if (input.brand) {
    parts.push(`<text x="${text.x}" y="${cursor + sizes.brand}" font-family="${FONT}" font-size="${sizes.brand}" font-weight="700" letter-spacing="1.5" fill="${MUTED}">${escapeXml(input.brand.toUpperCase().slice(0, 30))}</text>`);
    cursor += sizes.brand + 16;
  }

  // Nome curto
  for (const line of nameLines) {
    parts.push(`<text x="${text.x}" y="${cursor + sizes.name}" font-family="${FONT}" font-size="${sizes.name}" font-weight="800" fill="${INK}">${escapeXml(line)}</text>`);
    cursor += nameStep(sizes.name);
  }
  cursor += 24;

  // Preço datado e condicionado (só quando informado)
  if (input.price) {
    const base = cursor + sizes.price * 0.9;
    parts.push(
      `<text x="${text.x}" y="${base}" font-family="${FONT}" font-size="${sizes.price}" font-weight="800" fill="${INK}">${escapeXml(money(input.price.cents))}</text>`,
      `<text x="${text.x}" y="${base + sizes.note + 12}" font-family="${FONT}" font-size="${sizes.note}" fill="${MUTED}">Menor preço monitorado em ${dateBr(input.price.observedAt)}</text>`,
      `<text x="${text.x}" y="${base + sizes.note * 2 + 20}" font-family="${FONT}" font-size="${sizes.note}" fill="${MUTED}">Confirme o valor final na loja.</text>`,
    );
    cursor += Math.round(sizes.price * 0.9 + sizes.note * 2 + 44);
  }

  // Chamada (botão): fixo no rodapé na paisagem; logo após o texto nos verticais
  const ctaH = sizes.cta;
  const ctaY = L.horizontal ? H - pad - ctaH : Math.min(cursor + 6, H - pad - ctaH);
  const ctaW = L.horizontal ? text.w : W - pad * 2;
  parts.push(
    `<rect x="${text.x}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="${Math.round(ctaH * 0.28)}" fill="${BRAND}"/>`,
    `<text x="${text.x + ctaW / 2}" y="${ctaY + ctaH * 0.64}" text-anchor="middle" font-family="${FONT}" font-size="${Math.round(ctaH * 0.42)}" font-weight="700" fill="#FFFFFF">Comparar preços</text>`,
  );

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join("")}</svg>`;

  return sharp(Buffer.from(shapes))
    .composite([
      { input: photoBuffer, left: photoLeft, top: photoTop },
      { input: Buffer.from(overlay), left: 0, top: 0 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}
