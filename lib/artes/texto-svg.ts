import { LADO_ARTE_QUADRADA } from "./constantes";
import type { ZonaSelo, ZonaTexto } from "./layouts";

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

/** Monta o SVG (tamanho da arte inteira) com o bloco de título + preço posicionado na zona de texto. */
export function montarSvgTexto(zona: ZonaTexto, dados: DadosTexto): string {
  const lado = LADO_ARTE_QUADRADA;
  const x = (zona.xPct / 100) * lado;
  const y = (zona.yPct / 100) * lado;
  const largura = (zona.larguraPct / 100) * lado;

  const temPreco = Boolean(dados.precoAtual);
  const fontSizeTitulo = temPreco ? 42 : 50;
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
    const fontSizePreco = 34;
    const fontSizePrecoOriginal = 20;
    const yPreco = fimTitulo + 40;
    const precoOriginalTspan = dados.precoOriginal
      ? `<tspan font-family="'Manrope','Segoe UI',sans-serif" font-weight="400" text-decoration="line-through" font-size="${fontSizePrecoOriginal}" fill="${zona.corPrecoOriginal}">${escapeXml(dados.precoOriginal)}  </tspan>`
      : "";
    blocoPreco = `<text x="${anchorX}" y="${yPreco}" text-anchor="${textAnchor}" font-family="'Manrope','Segoe UI',sans-serif" font-weight="700" font-size="${fontSizePreco}" fill="${zona.corPreco}">${precoOriginalTspan}<tspan>${escapeXml(dados.precoAtual!)}</tspan></text>`;
  }

  return `<svg width="${lado}" height="${lado}" xmlns="http://www.w3.org/2000/svg">
    <text x="${anchorX}" y="${baselineTitulo}" text-anchor="${textAnchor}" font-family="'Newsreader',Georgia,serif" font-weight="600" font-size="${fontSizeTitulo}" fill="${zona.corTitulo}">${tspansTitulo}</text>
    ${blocoPreco}
  </svg>`;
}

/** Selo/badge (ex.: "-32% hoje", "Achadinho do dia") — pílula com texto centralizado. */
export function montarSvgSelo(zona: ZonaSelo, texto: string): string {
  const lado = LADO_ARTE_QUADRADA;
  const fontSize = 22;
  const paddingX = 22;
  const paddingY = 12;
  const larguraTexto = estimarLargura(texto, fontSize, 0.58);
  const largura = Math.round(larguraTexto + paddingX * 2);
  const altura = fontSize + paddingY * 2;

  const xCentro = (zona.xPct / 100) * lado;
  const y = (zona.yPct / 100) * lado;
  const x = zona.alinhamento === "center" ? xCentro - largura / 2 : xCentro;

  return `<svg width="${lado}" height="${lado}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x}" y="${y}" width="${largura}" height="${altura}" rx="${altura / 2}" ry="${altura / 2}" fill="${zona.corFundo}"/>
    <text x="${x + largura / 2}" y="${y + altura / 2 + fontSize * 0.35}" text-anchor="middle" font-family="'Manrope','Segoe UI',sans-serif" font-weight="700" font-size="${fontSize}" fill="${zona.corTexto}">${escapeXml(texto)}</text>
  </svg>`;
}
