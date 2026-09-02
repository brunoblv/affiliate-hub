import { CORES } from "./paleta";

/**
 * Tipo de arte gerada pelo pipeline — corresponde ao tipo de post/publicação
 * que consome a imagem (ver docs/Meu Novo Lar visual design (1)/Fundos
 * Templates Arte.dc.html). "oferta" é a landing diária (vitrine).
 */
export type TipoArte = "produto" | "lista" | "oferta" | "jornada";

export const TIPOS_ARTE: readonly TipoArte[] = ["produto", "lista", "oferta", "jornada"] as const;

/**
 * "quadrada" (1080×1080): Instagram, Pinterest, Telegram, WhatsApp.
 * "retangular" (1200×630): Facebook (página/grupo), publicado via /photos.
 * "capa" (1600×900, 16:9): capa do artigo no site — o CSS do blog recorta
 * essa mesma imagem em várias alturas (destaque, cards, "leia também",
 * página do post), então ela não carrega título nem preço, só foto/fundo.
 */
export type Formato = "quadrada" | "retangular" | "capa";

/** Quantas variantes de fundo existem por tipo no formato quadrado — ver public/fundos-posts/README.md. */
export const VARIANTES_POR_TIPO = 3;

interface RetanguloPct {
  formato: "retangulo";
  xPct: number;
  yPct: number;
  larguraPct: number;
  alturaPct: number;
  /** Raio de canto, em % da largura da imagem. */
  raioPct?: number;
}

interface CirculoPct {
  formato: "circulo";
  /** Centro do círculo, em % da imagem. */
  cxPct: number;
  cyPct: number;
  /** Raio, em % da largura da imagem. */
  raioPct: number;
}

export type ZonaFoto = RetanguloPct | CirculoPct;

export interface ZonaTexto {
  xPct: number;
  yPct: number;
  larguraPct: number;
  alturaPct: number;
  alinhamento: "left" | "center";
  corTitulo: string;
  corPreco: string;
  corPrecoOriginal: string;
}

export interface ZonaSelo {
  xPct: number;
  yPct: number;
  alinhamento: "left" | "center";
  corFundo: string;
  corTexto: string;
}

export interface VarianteLayout {
  /** Caminho relativo dentro de public/fundos-posts/<quadrado|retangular|capa>/<tipo>/. */
  arquivo: string;
  foto?: ZonaFoto;
  /** Opcional só por flexibilidade de layout — hoje toda variante define uma zona de texto. */
  texto?: ZonaTexto;
  selo?: ZonaSelo;
}

/**
 * Geometria de cada variante, extraída das zonas reservadas do mockup
 * (Fundos Templates Arte.dc.html) — o fundo em si (wordmark, decoração,
 * cor) já vem pronto no PNG; o pipeline só preenche foto + texto + selo.
 */
export const LAYOUTS_QUADRADOS: Record<TipoArte, VarianteLayout[]> = {
  produto: [
    {
      arquivo: "1.png",
      foto: { formato: "retangulo", xPct: 6, yPct: 11, larguraPct: 88, alturaPct: 49, raioPct: 2 },
      texto: {
        xPct: 6,
        yPct: 72,
        larguraPct: 88,
        alturaPct: 22,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.terracotaClara,
      },
    },
    {
      arquivo: "2.png",
      foto: { formato: "retangulo", xPct: 8, yPct: 16, larguraPct: 84, alturaPct: 62, raioPct: 2.5 },
      texto: {
        xPct: 8,
        yPct: 81,
        larguraPct: 84,
        alturaPct: 14,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: "#c9a591",
      },
    },
    {
      arquivo: "3.png",
      foto: { formato: "circulo", cxPct: 50, cyPct: 42, raioPct: 31 },
      texto: {
        xPct: 8,
        yPct: 79,
        larguraPct: 84,
        alturaPct: 15,
        alinhamento: "center",
        corTitulo: CORES.texto,
        corPreco: CORES.texto,
        corPrecoOriginal: CORES.textoSecundario,
      },
    },
  ],
  lista: [
    {
      arquivo: "1.png",
      foto: { formato: "retangulo", xPct: 7, yPct: 15, larguraPct: 86, alturaPct: 44, raioPct: 2 },
      texto: {
        xPct: 7,
        yPct: 64,
        larguraPct: 86,
        alturaPct: 30,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.card,
      },
    },
    {
      arquivo: "2.png",
      foto: { formato: "retangulo", xPct: 6, yPct: 16, larguraPct: 88, alturaPct: 48, raioPct: 2 },
      texto: {
        xPct: 6,
        yPct: 68,
        larguraPct: 88,
        alturaPct: 26,
        alinhamento: "left",
        corTitulo: CORES.texto,
        corPreco: CORES.texto,
        corPrecoOriginal: CORES.textoSecundario,
      },
    },
    {
      arquivo: "3.png",
      foto: { formato: "retangulo", xPct: 7, yPct: 14, larguraPct: 86, alturaPct: 46, raioPct: 2 },
      texto: {
        xPct: 7,
        yPct: 64,
        larguraPct: 86,
        alturaPct: 30,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.card,
      },
    },
  ],
  oferta: [
    {
      arquivo: "1.png",
      selo: { xPct: 7, yPct: 16, alinhamento: "left", corFundo: CORES.card, corTexto: CORES.terracota },
      foto: { formato: "retangulo", xPct: 7, yPct: 28, larguraPct: 86, alturaPct: 34, raioPct: 2 },
      texto: {
        xPct: 7,
        yPct: 66,
        larguraPct: 86,
        alturaPct: 28,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.terracotaClara,
      },
    },
    {
      arquivo: "2.png",
      selo: { xPct: 50, yPct: 14, alinhamento: "center", corFundo: CORES.card, corTexto: CORES.terracotaEscura },
      foto: { formato: "retangulo", xPct: 8, yPct: 26, larguraPct: 84, alturaPct: 38, raioPct: 2 },
      texto: {
        xPct: 8,
        yPct: 68,
        larguraPct: 84,
        alturaPct: 26,
        alinhamento: "center",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.terracotaClara,
      },
    },
    {
      arquivo: "3.png",
      selo: { xPct: 7, yPct: 16, alinhamento: "left", corFundo: CORES.oliva, corTexto: CORES.card },
      foto: { formato: "retangulo", xPct: 7, yPct: 28, larguraPct: 86, alturaPct: 34, raioPct: 2 },
      texto: {
        xPct: 7,
        yPct: 66,
        larguraPct: 86,
        alturaPct: 28,
        alinhamento: "left",
        corTitulo: CORES.texto,
        corPreco: CORES.texto,
        corPrecoOriginal: CORES.textoSecundario,
      },
    },
  ],
  jornada: [
    {
      arquivo: "1.png",
      foto: { formato: "retangulo", xPct: 7, yPct: 16, larguraPct: 86, alturaPct: 48, raioPct: 2 },
      texto: {
        xPct: 7,
        yPct: 70,
        larguraPct: 86,
        alturaPct: 24,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.card,
      },
    },
    {
      arquivo: "2.png",
      foto: { formato: "retangulo", xPct: 6, yPct: 17, larguraPct: 88, alturaPct: 50, raioPct: 2 },
      texto: {
        xPct: 6,
        yPct: 71,
        larguraPct: 88,
        alturaPct: 23,
        alinhamento: "left",
        corTitulo: CORES.texto,
        corPreco: CORES.texto,
        corPrecoOriginal: CORES.textoSecundario,
      },
    },
    {
      arquivo: "3.png",
      foto: { formato: "retangulo", xPct: 6, yPct: 15, larguraPct: 88, alturaPct: 50, raioPct: 2 },
      texto: {
        xPct: 6,
        yPct: 70,
        larguraPct: 88,
        alturaPct: 24,
        alinhamento: "center",
        corTitulo: CORES.texto,
        corPreco: CORES.texto,
        corPrecoOriginal: CORES.textoSecundario,
      },
    },
  ],
};

/**
 * Formato Facebook feed (1200×630, ver seção "Formato Facebook (feed)" do
 * mockup) — só 1 variante por tipo. Jornada não tem zona de foto: hoje o
 * Facebook de Jornada não leva imagem própria (post de link), então esse
 * layout fica pronto sem uso ainda — ver README de public/fundos-posts.
 */
export const LAYOUTS_RETANGULARES: Record<TipoArte, VarianteLayout[]> = {
  produto: [
    {
      arquivo: "1.png",
      foto: { formato: "retangulo", xPct: 0, yPct: 0, larguraPct: 44, alturaPct: 100 },
      texto: {
        xPct: 50,
        yPct: 40,
        larguraPct: 44,
        alturaPct: 40,
        alinhamento: "left",
        corTitulo: CORES.texto,
        corPreco: CORES.terracota,
        corPrecoOriginal: CORES.textoSecundario,
      },
    },
  ],
  lista: [
    {
      arquivo: "1.png",
      texto: {
        xPct: 8,
        yPct: 20,
        larguraPct: 70,
        alturaPct: 10,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.card,
      },
      foto: { formato: "retangulo", xPct: 8, yPct: 34, larguraPct: 34, alturaPct: 34, raioPct: 1.5 },
    },
  ],
  oferta: [
    {
      arquivo: "1.png",
      selo: { xPct: 6, yPct: 24, alinhamento: "left", corFundo: CORES.card, corTexto: CORES.terracota },
      texto: {
        xPct: 6,
        yPct: 38,
        larguraPct: 44,
        alturaPct: 40,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.terracotaClara,
      },
      foto: { formato: "retangulo", xPct: 59, yPct: 19, larguraPct: 39, alturaPct: 61, raioPct: 1.5 },
    },
  ],
  jornada: [
    {
      arquivo: "1.png",
      texto: {
        xPct: 8,
        yPct: 40,
        larguraPct: 52,
        alturaPct: 24,
        alinhamento: "left",
        corTitulo: CORES.card,
        corPreco: CORES.card,
        corPrecoOriginal: CORES.card,
      },
    },
  ],
};

/** Foto em tela cheia (o mesmo pra toda variante de capa) + título no canto inferior esquerdo, sobre véu escuro pra legibilidade. */
const FOTO_CHEIA: ZonaFoto = { formato: "retangulo", xPct: 0, yPct: 0, larguraPct: 100, alturaPct: 100 };
const TEXTO_CAPA: ZonaTexto = {
  xPct: 6,
  yPct: 64,
  larguraPct: 88,
  alturaPct: 30,
  alinhamento: "left",
  corTitulo: CORES.card,
  corPreco: CORES.card,
  corPrecoOriginal: CORES.card,
};

/**
 * Formato capa do site (1600×900, 16:9) — só produto/lista/jornada têm capa
 * de post (oferta é a landing diária, não tem capa própria). Título no canto
 * inferior esquerdo sobre um véu escuro (aplicado em compor.ts só nesse
 * formato) — funciona tanto com foto real quanto com o fundo de marca puro
 * quando ainda não há foto.
 */
export const LAYOUTS_CAPA: Record<TipoArte, VarianteLayout[]> = {
  produto: [
    { arquivo: "1.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
    { arquivo: "2.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
    { arquivo: "3.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
  ],
  lista: [
    { arquivo: "1.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
    { arquivo: "2.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
    { arquivo: "3.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
  ],
  oferta: [{ arquivo: "1.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA }],
  jornada: [
    { arquivo: "1.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
    { arquivo: "2.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
    { arquivo: "3.png", foto: FOTO_CHEIA, texto: TEXTO_CAPA },
  ],
};

const LAYOUTS_POR_FORMATO: Record<Formato, Record<TipoArte, VarianteLayout[]>> = {
  quadrada: LAYOUTS_QUADRADOS,
  retangular: LAYOUTS_RETANGULARES,
  capa: LAYOUTS_CAPA,
};

/** Escolhe a variante de forma determinística — o mesmo id sempre gera a mesma arte. */
export function escolherVariante(tipo: TipoArte, semente: string, formato: Formato = "quadrada"): VarianteLayout {
  let hash = 0;
  for (let i = 0; i < semente.length; i++) {
    hash = (hash * 31 + semente.charCodeAt(i)) >>> 0;
  }
  const variantes = LAYOUTS_POR_FORMATO[formato][tipo];
  return variantes[hash % variantes.length];
}
