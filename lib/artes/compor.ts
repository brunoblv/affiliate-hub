import sharp, { type OverlayOptions } from "sharp";
import { LADO_ARTE_QUADRADA } from "./constantes";
import { caminhoDoFundo, fundoDisponivel } from "./fundos";
import { resolverBufferDeImagem } from "./foto";
import { escolherVariante, type TipoArte, type ZonaFoto } from "./layouts";
import { montarSvgSelo, montarSvgTexto } from "./texto-svg";

export interface EntradaArte {
  tipo: TipoArte;
  /** Escolhe a variante de forma determinística — mesmo id sempre gera a mesma arte. */
  semente: string;
  titulo: string;
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

/**
 * Compõe a arte quadrada (1080×1080): fundo pronto (wordmark/decoração já
 * embutidos no PNG) + foto do produto/capa recortada na zona reservada +
 * título/preço/selo em texto. Devolve `null` quando o fundo daquele tipo
 * ainda não foi colocado em public/fundos-posts/<tipo>/ — quem chama deve
 * cair de volta no comportamento antigo (foto crua) nesse caso.
 */
export async function comporArteQuadrada(entrada: EntradaArte): Promise<ArteComposta | null> {
  const layout = escolherVariante(entrada.tipo, entrada.semente);
  if (!fundoDisponivel(entrada.tipo, layout.arquivo)) return null;

  const fundoBuffer = await sharp(caminhoDoFundo(entrada.tipo, layout.arquivo))
    .resize(LADO_ARTE_QUADRADA, LADO_ARTE_QUADRADA, { fit: "cover" })
    .toBuffer();

  const camadas: OverlayOptions[] = [];

  if (layout.foto && entrada.fotoUrl) {
    const fotoComposta = await comporFoto(layout.foto, entrada.fotoUrl);
    if (fotoComposta) camadas.push(fotoComposta);
  }

  if (layout.selo && entrada.selo) {
    camadas.push({ input: Buffer.from(montarSvgSelo(layout.selo, entrada.selo)), left: 0, top: 0 });
  }

  camadas.push({
    input: Buffer.from(
      montarSvgTexto(layout.texto, {
        titulo: entrada.titulo,
        precoAtual: entrada.precoAtual ?? null,
        precoOriginal: entrada.precoOriginal ?? null,
      }),
    ),
    left: 0,
    top: 0,
  });

  const buffer = await sharp(fundoBuffer).composite(camadas).png().toBuffer();
  return { buffer, variante: layout.arquivo };
}

async function comporFoto(zona: ZonaFoto, fotoUrl: string): Promise<OverlayOptions | null> {
  try {
    const original = await resolverBufferDeImagem(fotoUrl);
    const lado = LADO_ARTE_QUADRADA;

    if (zona.formato === "circulo") {
      const diametro = Math.round((zona.raioPct * 2 * lado) / 100);
      const left = Math.round((zona.cxPct * lado) / 100 - diametro / 2);
      const top = Math.round((zona.cyPct * lado) / 100 - diametro / 2);
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

    const largura = Math.round((zona.larguraPct * lado) / 100);
    const altura = Math.round((zona.alturaPct * lado) / 100);
    const left = Math.round((zona.xPct * lado) / 100);
    const top = Math.round((zona.yPct * lado) / 100);
    const raio = Math.round(((zona.raioPct ?? 0) * lado) / 100);
    const mascara = Buffer.from(
      `<svg width="${largura}" height="${altura}"><rect width="${largura}" height="${altura}" rx="${raio}" ry="${raio}" fill="#fff"/></svg>`,
    );
    const foto = await sharp(original)
      .resize(largura, altura, { fit: "cover" })
      .composite([{ input: mascara, blend: "dest-in" }])
      .png()
      .toBuffer();
    return { input: foto, left, top };
  } catch {
    // Foto indisponível (CDN fora do ar, URL quebrada) — a arte sai só com fundo + texto.
    return null;
  }
}
