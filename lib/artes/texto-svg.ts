import { LADO_ARTE_QUADRADA } from "./constantes";
import type { ZonaSelo, ZonaTexto } from "./layouts";

/** Dimensões do canvas em que o SVG será composto — o quadrado (1080) é a referência de escala da fonte. */
export interface CanvasArte {
  largura: number;
  altura: number;
}

function escapeXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Estimativa de largura renderizada — não há medição real de fonte fora do navegador. */
function estimarLargura(texto: string, fontSizePx: number, fator: number): number {
  return texto.length * fontSizePx * fator;
}

function quebrarLinhas(texto: string, larguraMaximaPx: number, fontSizePx: number, fator: number, maxLinhas: number): string[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (!atual || estimarLargura(tentativa, fontSizePx, fator) <= larguraMaximaPx) {
      atual = tentativa;
      continue;
    }
    linhas.push(atual);
    atual = palavra;
    if (linhas.length === maxLinhas) break;
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual);

  const restante = texto.trim().length > linhas.join(" ").length;
  if (restante && linhas.length === maxLinhas) {
    const ultimoIndex = linhas.length - 1;
    let ultima = linhas[ultimoIndex];
    while (ultima.length > 1 && estimarLargura(`${ultima}…`, fontSizePx, fator) > larguraMaximaPx) {
      ultima = ultima.slice(0, -1).trimEnd();
    }
    linhas[ultimoIndex] = `${ultima}…`;
  }

  return linhas;
}

export interface DadosTexto {
  titulo: string;
  precoAtual?: string | null;
  precoOriginal?: string | null;
}

/** Monta o SVG (tamanho do canvas inteiro) com o bloco de título + preço posicionado na zona de texto. */
export function montarSvgTexto(zona: ZonaTexto, dados: DadosTexto, canvas: CanvasArte): string {
  const { largura: larguraCanvas, altura: alturaCanvas } = canvas;
  // A geometria dos layouts foi desenhada pensando num canvas de 1080px de altura — escala as fontes
  // proporcionalmente pra formatos mais baixos (ex.: o retangular de 630px) manterem a mesma leitura.
  const escala = alturaCanvas / LADO_ARTE_QUADRADA;

  const x = (zona.xPct / 100) * larguraCanvas;
  const y = (zona.yPct / 100) * alturaCanvas;
  const largura = (zona.larguraPct / 100) * larguraCanvas;

  const temPreco = Boolean(dados.precoAtual);
  const fontSizeTitulo = Math.round((temPreco ? 42 : 50) * escala);
  const maxLinhas = temPreco ? 2 : 3;
  const alturaLinha = Math.round(fontSizeTitulo * 1.22);

  const linhas = quebrarLinhas(dados.titulo, largura, fontSizeTitulo, 0.54, maxLinhas);

  const anchorX = zona.alinhamento === "center" ? x + largura / 2 : x;
  const textAnchor = zona.alinhamento === "center" ? "middle" : "start";

  const tspansTitulo = linhas
    .map((linha, i) => `<tspan x="${anchorX}" dy="${i === 0 ? 0 : alturaLinha}">${escapeXml(linha)}</tspan>`)
    .join("");

  const baselineTitulo = y + fontSizeTitulo;
  const fimTitulo = baselineTitulo + (linhas.length - 1) * alturaLinha;

  let blocoPreco = "";
  if (temPreco) {
    const fontSizePreco = Math.round(34 * escala);
    const fontSizePrecoOriginal = Math.round(20 * escala);
    const yPreco = fimTitulo + Math.round(40 * escala);
    const precoOriginalTspan = dados.precoOriginal
      ? `<tspan font-family="'Manrope','Segoe UI',sans-serif" font-weight="400" text-decoration="line-through" font-size="${fontSizePrecoOriginal}" fill="${zona.corPrecoOriginal}">${escapeXml(dados.precoOriginal)}  </tspan>`
      : "";
    blocoPreco = `<text x="${anchorX}" y="${yPreco}" text-anchor="${textAnchor}" font-family="'Manrope','Segoe UI',sans-serif" font-weight="700" font-size="${fontSizePreco}" fill="${zona.corPreco}">${precoOriginalTspan}<tspan>${escapeXml(dados.precoAtual!)}</tspan></text>`;
  }

  return `<svg width="${larguraCanvas}" height="${alturaCanvas}" xmlns="http://www.w3.org/2000/svg">
    <text x="${anchorX}" y="${baselineTitulo}" text-anchor="${textAnchor}" font-family="'Newsreader',Georgia,serif" font-weight="600" font-size="${fontSizeTitulo}" fill="${zona.corTitulo}">${tspansTitulo}</text>
    ${blocoPreco}
  </svg>`;
}

/** Véu (gradiente escuro de baixo pra cima) — garante legibilidade de texto claro sobre foto em tela cheia. */
export function montarSvgVeu(canvas: CanvasArte): string {
  const { largura, altura } = canvas;
  return `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="veu" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.7"/>
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
    </linearGradient></defs>
    <rect width="${largura}" height="${altura}" fill="url(#veu)"/>
  </svg>`;
}

/** Selo/badge (ex.: "-32% hoje", "Achadinho do dia") — pílula com texto centralizado. */
export function montarSvgSelo(zona: ZonaSelo, texto: string, canvas: CanvasArte): string {
  const { largura: larguraCanvas, altura: alturaCanvas } = canvas;
  const escala = alturaCanvas / LADO_ARTE_QUADRADA;

  const fontSize = Math.round(22 * escala);
  const paddingX = Math.round(22 * escala);
  const paddingY = Math.round(12 * escala);
  const larguraTexto = estimarLargura(texto, fontSize, 0.58);
  const largura = Math.round(larguraTexto + paddingX * 2);
  const altura = fontSize + paddingY * 2;

  const xCentro = (zona.xPct / 100) * larguraCanvas;
  const y = (zona.yPct / 100) * alturaCanvas;
  const x = zona.alinhamento === "center" ? xCentro - largura / 2 : xCentro;

  return `<svg width="${larguraCanvas}" height="${alturaCanvas}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x}" y="${y}" width="${largura}" height="${altura}" rx="${altura / 2}" ry="${altura / 2}" fill="${zona.corFundo}"/>
    <text x="${x + largura / 2}" y="${y + altura / 2 + fontSize * 0.35}" text-anchor="middle" font-family="'Manrope','Segoe UI',sans-serif" font-weight="700" font-size="${fontSize}" fill="${zona.corTexto}">${escapeXml(texto)}</text>
  </svg>`;
}
