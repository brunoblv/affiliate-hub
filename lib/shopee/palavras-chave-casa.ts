import { Categoria } from "@/lib/database/enums";
import { COMODOS_CASA } from "./catalogo-comodos";

/**
 * Um par keyword/categoria por cômodo (os dois primeiros tipos) — volume
 * parecido com a lista antiga, mas com termos concretos do catálogo.
 */
export const PALAVRAS_CHAVE_CASA: Array<{ keyword: string; categoria: Categoria }> = COMODOS_CASA.flatMap((comodo) =>
  comodo.itens.slice(0, 2).map((item) => ({ keyword: item.keyword, categoria: item.categoria })),
);

/**
 * Rede de segurança: mesmo buscando por palavra-chave de casa, a Shopee às
 * vezes casa por termo solto no título e devolve produto fora do tema
 * (ex.: "tênis de corrida leve para casa" caiu numa busca de organização).
 * Qualquer nome de produto que bata com um desses termos é descartado antes
 * de importar, independente da categoria/keyword que trouxe a oferta.
 *
 * Termos curtos usam fronteira de palavra — senão "maio" derruba "maior" e
 * "console" derruba aparador console de sala.
 */
const TERMOS_PROIBIDOS = [
  "tênis",
  "tenis",
  "chuteira",
  "action figure",
  "boneco articulado",
  "colecionável",
  "colecionavel",
  "videogame",
  "vídeo game",
  "video game",
  "xbox",
  "playstation",
  "nintendo",
  "joystick",
  "controle de video game",
  "seringa",
  "insulina",
  "sutiã",
  "sutia",
  "calcinha",
  "biquíni",
  "biquini",
  "maiô",
  "whey protein",
  "suplemento alimentar",
  "power bank",
  "carregador portátil",
  "carregador portatil",
  "fone bluetooth",
  "smartwatch",
  "relógio inteligente",
  "relogio inteligente",
  "capinha de celular",
  "capa de celular",
  "película de celular",
  "pelicula de celular",
  "roupa fitness",
  "legging fitness",
  "iphone",
  "xiaomi",
  "notebook",
  "maquiagem",
  "batom",
  "barbie",
];

const REGEX_PROIBIDOS = new RegExp(
  `\\b(?:${TERMOS_PROIBIDOS.map((termo) => termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

/** true se o nome do produto bater com algum termo fora do tema "casa". */
export function ehForaDoTemaCasa(nomeProduto: string): boolean {
  return REGEX_PROIBIDOS.test(nomeProduto);
}
