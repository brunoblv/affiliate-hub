/**
 * Gera os fundos das artes de post a partir da identidade visual "Meu Novo
 * Lar" (ver docs/Meu Novo Lar visual design (1)/Fundos Templates Arte.dc.html)
 * — reproduz cores, gradientes, texturas e a wordmark de cada variante como
 * PNG real em public/fundos-posts/. O pipeline de composição (lib/artes/)
 * não gera esses fundos sozinho: ele só sabe recortar foto e escrever texto
 * por cima de um PNG que já existe — rode este script sempre que quiser
 * recriar/ajustar os fundos (idempotente, sobrescreve os arquivos).
 *
 * Uso: npx tsx scripts/gerar-fundos-posts.ts
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const RAIZ = path.join(process.cwd(), "public", "fundos-posts");

const CORES = {
  creme: "#F8F6F1",
  texto: "#292824",
  terracota: "#B8664F",
  terracotaEscura: "#8F493A",
  terracotaClara: "#f3d9cf",
  salvia: "#87947B",
  salviaClara: "#e7ebe2",
  oliva: "#657A55",
  oliveClaro: "#dbe4d4",
  areia: "#EDE6DA",
  grafite: "#292824",
  grafiteClaro: "#a19c90",
};

function wordmark(x: number, y: number, cor: string, fontSize: number, anchor: "start" | "middle" = "start"): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="'Manrope','Segoe UI',sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="${fontSize * 0.14}" fill="${cor}">MEU NOVO LAR</text>`;
}

interface Fundo {
  tipo: string;
  formato: "quadrado" | "retangular" | "capa";
  arquivo: string;
  largura: number;
  altura: number;
  svg: string;
}

const FUNDOS: Fundo[] = [];

// ---------------------------------------------------------------------------
// QUADRADO (1080×1080) — 3 variantes por tipo
// ---------------------------------------------------------------------------
const L = 1080;

FUNDOS.push(
  {
    tipo: "produto",
    formato: "quadrado",
    arquivo: "1.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.creme}"/>
      <rect y="${L * 0.62}" width="${L}" height="${L * 0.38}" fill="url(#g1)"/>
      <defs><linearGradient id="g1" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="${CORES.terracotaEscura}"/><stop offset="1" stop-color="${CORES.terracota}"/>
      </linearGradient></defs>
      ${wordmark(L * 0.06, L * 0.065, CORES.terracotaEscura, 26)}
    `,
  },
  {
    tipo: "produto",
    formato: "quadrado",
    arquivo: "2.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.grafite}"/>
      <circle cx="${L * 0.875}" cy="${L * 0.125}" r="${L * 0.375}" fill="url(#g2)"/>
      <defs><radialGradient id="g2"><stop offset="0" stop-color="${CORES.terracota}" stop-opacity="0.4"/><stop offset="0.7" stop-color="${CORES.terracota}" stop-opacity="0"/></radialGradient></defs>
      ${wordmark(L * 0.06, L * 0.06, "#c9a591", 26)}
    `,
  },
  {
    tipo: "produto",
    formato: "quadrado",
    arquivo: "3.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.areia}"/>
      ${listras(L, L, "rgba(184,102,79,.07)", 35)}
      ${wordmark(L / 2, L * 0.065, CORES.terracotaEscura, 26, "middle")}
    `,
  },
);

FUNDOS.push(
  {
    tipo: "lista",
    formato: "quadrado",
    arquivo: "1.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.salvia}"/>
      <circle cx="${L * 0.86}" cy="${L * 0.14}" r="${L * 0.275}" fill="rgba(255,255,255,.10)"/>
      ${wordmark(L * 0.07, L * 0.065, CORES.salviaClara, 26)}
    `,
  },
  {
    tipo: "lista",
    formato: "quadrado",
    arquivo: "2.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.creme}"/>
      <rect width="${L}" height="${L * 0.05}" fill="${CORES.salvia}"/>
      ${wordmark(L * 0.06, L * 0.095, CORES.oliva, 26)}
    `,
  },
  {
    tipo: "lista",
    formato: "quadrado",
    arquivo: "3.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.oliva}"/>
      <circle cx="${L * -0.2}" cy="${L * 1.2}" r="${L * 0.325}" fill="rgba(0,0,0,.12)"/>
      ${wordmark(L * 0.07, L * 0.065, CORES.oliveClaro, 26)}
    `,
  },
);

FUNDOS.push(
  {
    tipo: "oferta",
    formato: "quadrado",
    arquivo: "1.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.terracota}"/>
      ${pontilhado(L, L, 26)}
      ${wordmark(L * 0.07, L * 0.065, CORES.terracotaClara, 26)}
    `,
  },
  {
    tipo: "oferta",
    formato: "quadrado",
    arquivo: "2.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.terracotaEscura}"/>
      ${wordmark(L / 2, L * 0.065, CORES.terracotaClara, 26, "middle")}
    `,
  },
  {
    tipo: "oferta",
    formato: "quadrado",
    arquivo: "3.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.areia}"/>
      ${diagonal(L, L, "rgba(101,122,85,.06)", 36)}
      ${wordmark(L * 0.07, L * 0.065, CORES.terracotaEscura, 26)}
    `,
  },
);

FUNDOS.push(
  {
    tipo: "jornada",
    formato: "quadrado",
    arquivo: "1.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.grafite}"/>
      <circle cx="${L * 1.15}" cy="${L * 1.15}" r="${L * 0.4}" fill="url(#g3)"/>
      <defs><radialGradient id="g3"><stop offset="0" stop-color="${CORES.oliva}" stop-opacity="0.25"/><stop offset="0.7" stop-color="${CORES.oliva}" stop-opacity="0"/></radialGradient></defs>
      ${wordmark(L * 0.07, L * 0.065, CORES.grafiteClaro, 26)}
    `,
  },
  {
    tipo: "jornada",
    formato: "quadrado",
    arquivo: "2.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.creme}"/>
      <rect width="${L}" height="${L * 0.05}" fill="${CORES.terracota}"/>
      ${wordmark(L * 0.06, L * 0.095, CORES.terracota, 26)}
    `,
  },
  {
    tipo: "jornada",
    formato: "quadrado",
    arquivo: "3.png",
    largura: L,
    altura: L,
    svg: `
      <rect width="${L}" height="${L}" fill="${CORES.areia}"/>
      ${listras(L, L, "rgba(184,102,79,.05)", 35)}
      ${wordmark(L / 2, L * 0.065, CORES.terracotaEscura, 26, "middle")}
    `,
  },
);

// ---------------------------------------------------------------------------
// RETANGULAR (1200×630) — 1 variante por tipo (formato Facebook feed)
// ---------------------------------------------------------------------------
const W = 1200;
const H = 630;

FUNDOS.push(
  {
    tipo: "produto",
    formato: "retangular",
    arquivo: "1.png",
    largura: W,
    altura: H,
    svg: `
      <rect width="${W}" height="${H}" fill="${CORES.creme}"/>
      <rect width="${W * 0.44}" height="${H}" fill="url(#g4)"/>
      <defs><linearGradient id="g4" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="${CORES.terracota}"/><stop offset="1" stop-color="${CORES.terracotaEscura}"/>
      </linearGradient></defs>
      ${wordmark(W * 0.48, H * 0.1, CORES.terracotaEscura, 22)}
    `,
  },
  {
    tipo: "lista",
    formato: "retangular",
    arquivo: "1.png",
    largura: W,
    altura: H,
    svg: `
      <rect width="${W}" height="${H}" fill="${CORES.salvia}"/>
      <circle cx="${W * 1.1}" cy="${H * -0.25}" r="${H * 0.7}" fill="rgba(255,255,255,.10)"/>
      ${wordmark(W * 0.07, H * 0.11, CORES.salviaClara, 22)}
    `,
  },
  {
    tipo: "oferta",
    formato: "retangular",
    arquivo: "1.png",
    largura: W,
    altura: H,
    svg: `
      <rect width="${W}" height="${H}" fill="${CORES.terracota}"/>
      ${pontilhado(W, H, 24)}
      ${wordmark(W * 0.06, H * 0.11, CORES.terracotaClara, 22)}
    `,
  },
  {
    tipo: "jornada",
    formato: "retangular",
    arquivo: "1.png",
    largura: W,
    altura: H,
    svg: `
      <rect width="${W}" height="${H}" fill="${CORES.grafite}"/>
      <circle cx="${W * 1.15}" cy="${H * 1.25}" r="${H * 0.6}" fill="url(#g5)"/>
      <defs><radialGradient id="g5"><stop offset="0" stop-color="${CORES.oliva}" stop-opacity="0.25"/><stop offset="0.7" stop-color="${CORES.oliva}" stop-opacity="0"/></radialGradient></defs>
      ${wordmark(W * 0.08, H * 0.11, CORES.grafiteClaro, 22)}
    `,
  },
);

// ---------------------------------------------------------------------------
// CAPA (1600×900, 16:9) — capa do site: sem texto, só fundo/foto em tela cheia.
// Reaproveita a paleta das variantes quadradas pra manter a identidade.
// ---------------------------------------------------------------------------
const CW = 1600;
const CH = 900;

FUNDOS.push(
  {
    tipo: "produto",
    formato: "capa",
    arquivo: "1.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="url(#c1)"/>
      <defs><linearGradient id="c1" x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0" stop-color="${CORES.terracota}"/><stop offset="1" stop-color="${CORES.terracotaEscura}"/>
      </linearGradient></defs>`,
  },
  {
    tipo: "produto",
    formato: "capa",
    arquivo: "2.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.grafite}"/>
      <circle cx="${CW * 0.85}" cy="${CH * 0.15}" r="${CH * 0.6}" fill="url(#c2)"/>
      <defs><radialGradient id="c2"><stop offset="0" stop-color="${CORES.terracota}" stop-opacity="0.4"/><stop offset="0.7" stop-color="${CORES.terracota}" stop-opacity="0"/></radialGradient></defs>`,
  },
  {
    tipo: "produto",
    formato: "capa",
    arquivo: "3.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.areia}"/>${listras(CW, CH, "rgba(184,102,79,.07)", 35)}`,
  },
  {
    tipo: "lista",
    formato: "capa",
    arquivo: "1.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.salvia}"/><circle cx="${CW * 0.88}" cy="${CH * 0.12}" r="${CH * 0.55}" fill="rgba(255,255,255,.10)"/>`,
  },
  {
    tipo: "lista",
    formato: "capa",
    arquivo: "2.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.creme}"/><rect width="${CW}" height="${CH * 0.05}" fill="${CORES.salvia}"/>`,
  },
  {
    tipo: "lista",
    formato: "capa",
    arquivo: "3.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.oliva}"/><circle cx="${CW * 0.08}" cy="${CH * 0.9}" r="${CH * 0.55}" fill="rgba(0,0,0,.12)"/>`,
  },
  {
    tipo: "oferta",
    formato: "capa",
    arquivo: "1.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.terracota}"/>${pontilhado(CW, CH, 28)}`,
  },
  {
    tipo: "jornada",
    formato: "capa",
    arquivo: "1.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.grafite}"/>
      <circle cx="${CW * 0.15}" cy="${CH * 1.1}" r="${CH * 0.7}" fill="url(#c3)"/>
      <defs><radialGradient id="c3"><stop offset="0" stop-color="${CORES.oliva}" stop-opacity="0.25"/><stop offset="0.7" stop-color="${CORES.oliva}" stop-opacity="0"/></radialGradient></defs>`,
  },
  {
    tipo: "jornada",
    formato: "capa",
    arquivo: "2.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.creme}"/><rect width="${CW}" height="${CH * 0.05}" fill="${CORES.terracota}"/>`,
  },
  {
    tipo: "jornada",
    formato: "capa",
    arquivo: "3.png",
    largura: CW,
    altura: CH,
    svg: `<rect width="${CW}" height="${CH}" fill="${CORES.areia}"/>${listras(CW, CH, "rgba(184,102,79,.05)", 35)}`,
  },
);

function listras(largura: number, altura: number, cor: string, espacamento: number): string {
  let linhas = "";
  for (let y = 0; y < altura; y += espacamento) {
    linhas += `<rect x="0" y="${y}" width="${largura}" height="1" fill="${cor}"/>`;
  }
  return linhas;
}

function diagonal(largura: number, altura: number, cor: string, tamanho: number): string {
  return `<pattern id="diag" width="${tamanho}" height="${tamanho}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="${tamanho / 2}" height="${tamanho}" fill="${cor}"/>
    </pattern>
    <rect width="${largura}" height="${altura}" fill="url(#diag)"/>`;
}

function pontilhado(largura: number, altura: number, espacamento: number): string {
  let pontos = "";
  for (let y = espacamento / 2; y < altura; y += espacamento) {
    for (let x = espacamento / 2; x < largura; x += espacamento) {
      pontos += `<circle cx="${x}" cy="${y}" r="1.5" fill="#fff" opacity="0.12"/>`;
    }
  }
  return pontos;
}

async function main() {
  for (const fundo of FUNDOS) {
    const svg = `<svg width="${fundo.largura}" height="${fundo.altura}" xmlns="http://www.w3.org/2000/svg">${fundo.svg}</svg>`;
    const pasta = path.join(RAIZ, fundo.formato, fundo.tipo);
    await mkdir(pasta, { recursive: true });
    const destino = path.join(pasta, fundo.arquivo);
    await sharp(Buffer.from(svg)).png().toFile(destino);
    console.log("gerado:", path.relative(process.cwd(), destino));
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
