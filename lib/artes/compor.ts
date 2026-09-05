import sharp, { type OverlayOptions } from "sharp";
import {
  ALTURA_ARTE_CAPA,
  ALTURA_ARTE_RETANGULAR,
  LADO_ARTE_QUADRADA,
  LARGURA_ARTE_CAPA,
  LARGURA_ARTE_RETANGULAR,
} from "./constantes";
import { caminhoDoFundo, fundoDisponivel } from "./fundos";
import { resolverBufferDeImagem } from "./foto";
import { escolherVariante, ZONA_FOTO_CAPA_IA, type Formato, type TipoArte, type ZonaFoto } from "./layouts";
import { montarSvgSelo, montarSvgTexto, montarSvgVeu, type CanvasArte } from "./texto-svg";

export interface EntradaArte {
  tipo: TipoArte;
  /** "quadrada" (padrão), "retangular" (Facebook feed, 1200×630) ou "capa" (site, 1600×900). */
  formato?: Formato;
  /** Escolhe a variante de forma determinística — mesmo id sempre gera a mesma arte. */
  semente: string;
  titulo?: string;
  fotoUrl?: string | null;
  /** Já formatados (ex.: "R$ 611") — a arte não faz câmbio nem arredondamento. */
  precoAtual?: string | null;
  precoOriginal?: string | null;
  selo?: string | null;
}

export interface ArteComposta {
  buffer: Buffer;
  /** Nome do arquivo de fundo usado (ex.: "2.png") — útil pra depurar/registrar qual variante saiu. */
  variante: string;
}

function canvasDoFormato(formato: Formato): CanvasArte {
  if (formato === "retangular") return { largura: LARGURA_ARTE_RETANGULAR, altura: ALTURA_ARTE_RETANGULAR };
  if (formato === "capa") return { largura: LARGURA_ARTE_CAPA, altura: ALTURA_ARTE_CAPA };
  return { largura: LADO_ARTE_QUADRADA, altura: LADO_ARTE_QUADRADA };
}

/**
 * Compõe a arte (fundo pronto — wordmark/decoração já embutidos no PNG —
 * + foto do produto/capa recortada na zona reservada + título/preço/selo em
 * texto). Devolve `null` quando o fundo daquele tipo/formato ainda não foi
 * colocado em public/fundos-posts/ — quem chama deve cair de volta no
 * comportamento antigo (foto crua) nesse caso.
 */
export async function comporArte(entrada: EntradaArte): Promise<ArteComposta | null> {
  const formato = entrada.formato ?? "quadrada";
  const canvas = canvasDoFormato(formato);
  const layout = escolherVariante(entrada.tipo, entrada.semente, formato);
  if (!fundoDisponivel(entrada.tipo, layout.arquivo, formato)) return null;

  const fundoBuffer = await sharp(caminhoDoFundo(entrada.tipo, layout.arquivo, formato))
    .resize(canvas.largura, canvas.altura, { fit: "cover" })
    .toBuffer();

  const camadas: OverlayOptions[] = [];

  if (layout.foto && entrada.fotoUrl) {
    const fotoComposta = await comporFoto(layout.foto, entrada.fotoUrl, canvas);
    if (fotoComposta) camadas.push(fotoComposta);
  }

  // Capa: título sempre em texto, por cima de foto em tela cheia (real ou só
  // o fundo de marca) — o véu garante legibilidade do texto claro em
  // qualquer foto, clara ou escura.
  if (formato === "capa" && layout.texto) {
    camadas.push({ input: Buffer.from(montarSvgVeu(canvas)), left: 0, top: 0 });
  }

  if (layout.selo && entrada.selo) {
    camadas.push({ input: Buffer.from(montarSvgSelo(layout.selo, entrada.selo, canvas)), left: 0, top: 0 });
  }

  if (layout.texto && entrada.titulo) {
    camadas.push({
      input: Buffer.from(
        montarSvgTexto(
          layout.texto,
          {
            titulo: entrada.titulo,
            precoAtual: entrada.precoAtual ?? null,
            precoOriginal: entrada.precoOriginal ?? null,
          },
          canvas,
        ),
      ),
      left: 0,
      top: 0,
    });
  }

  const buffer = await sharp(fundoBuffer).composite(camadas).png().toBuffer();
  return { buffer, variante: layout.arquivo };
}

/**
 * Capa do site: cena gerada (IA) recortada na moldura do fundo de marca.
 * Sem título — o blog já mostra o título fora da imagem.
 */
export async function comporCapaComCena(entrada: {
  tipo: TipoArte;
  semente: string;
  cena: Buffer;
}): Promise<ArteComposta | null> {
  const formato: Formato = "capa";
  const canvas = canvasDoFormato(formato);
  const layout = escolherVariante(entrada.tipo, entrada.semente, formato);
  if (!fundoDisponivel(entrada.tipo, layout.arquivo, formato)) return null;

  const fundoBuffer = await sharp(caminhoDoFundo(entrada.tipo, layout.arquivo, formato))
    .resize(canvas.largura, canvas.altura, { fit: "cover" })
    .toBuffer();

  const foto = await recortarFoto(ZONA_FOTO_CAPA_IA, entrada.cena, canvas);
  const buffer = await sharp(fundoBuffer).composite(foto ? [foto] : []).png().toBuffer();
  return { buffer, variante: layout.arquivo };
}

async function recortarFoto(zona: ZonaFoto, original: Buffer, canvas: CanvasArte): Promise<OverlayOptions> {
  const { largura: larguraCanvas, altura: alturaCanvas } = canvas;

  if (zona.formato === "circulo") {
    const diametro = Math.round((zona.raioPct * 2 * larguraCanvas) / 100);
    const left = Math.round((zona.cxPct * larguraCanvas) / 100 - diametro / 2);
    const top = Math.round((zona.cyPct * alturaCanvas) / 100 - diametro / 2);
    const mascara = Buffer.from(
      `<svg width="${diametro}" height="${diametro}"><circle cx="${diametro / 2}" cy="${diametro / 2}" r="${diametro / 2}" fill="#fff"/></svg>`,
    );
    const foto = await sharp(original)
      .resize(diametro, diametro, { fit: "cover" })
      .composite([{ input: mascara, blend: "dest-in" }])
      .png()
      .toBuffer();
    return { input: foto, left, top };
  }

  const largura = Math.round((zona.larguraPct / 100) * larguraCanvas);
  const altura = Math.round((zona.alturaPct / 100) * alturaCanvas);
  const left = Math.round((zona.xPct / 100) * larguraCanvas);
  const top = Math.round((zona.yPct / 100) * alturaCanvas);
  const raio = Math.round(((zona.raioPct ?? 0) / 100) * larguraCanvas);
  const mascara = Buffer.from(
    `<svg width="${largura}" height="${altura}"><rect width="${largura}" height="${altura}" rx="${raio}" ry="${raio}" fill="#fff"/></svg>`,
  );
  const foto = await sharp(original)
    .resize(largura, altura, { fit: "cover" })
    .composite([{ input: mascara, blend: "dest-in" }])
    .png()
    .toBuffer();
  return { input: foto, left, top };
}

async function comporFoto(zona: ZonaFoto, fotoUrl: string, canvas: CanvasArte): Promise<OverlayOptions | null> {
  try {
    const original = await resolverBufferDeImagem(fotoUrl);
    return await recortarFoto(zona, original, canvas);
  } catch {
    // Foto indisponível (CDN fora do ar, URL quebrada) — a arte sai só com fundo + texto.
    return null;
  }
}
