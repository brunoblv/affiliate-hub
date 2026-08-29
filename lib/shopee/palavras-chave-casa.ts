import { Categoria } from "@/lib/database";

/**
 * Termos de busca usados pela descoberta automática (`descobrir-ofertas.ts`)
 * pra puxar só produtos de casa da Shopee, em vez das top ofertas gerais
 * (que trazia qualquer coisa — tênis, action figure, videogame, seringa
 * etc., já que a Shopee não classifica a oferta por tema nenhum). Cada termo
 * já carrega a `Categoria` que o produto encontrado recebe.
 */
export const PALAVRAS_CHAVE_CASA: Array<{ keyword: string; categoria: Categoria }> = [
  { keyword: "organizador para casa", categoria: Categoria.ORGANIZACAO },
  { keyword: "utensílios de cozinha", categoria: Categoria.COZINHA },
  { keyword: "acessórios para banheiro", categoria: Categoria.BANHEIRO },
  { keyword: "cesto de roupa suja", categoria: Categoria.LAVANDERIA },
  { keyword: "produtos de limpeza doméstica", categoria: Categoria.LIMPEZA },
  { keyword: "decoração para casa", categoria: Categoria.DECORACAO },
  { keyword: "luminária para casa", categoria: Categoria.ILUMINACAO },
  { keyword: "móveis para casa", categoria: Categoria.MOVEIS },
  { keyword: "ferramentas manuais para casa", categoria: Categoria.FERRAMENTAS },
  { keyword: "jardinagem", categoria: Categoria.JARDIM },
  { keyword: "eletrodomésticos para cozinha", categoria: Categoria.ELETRODOMESTICOS },
];

/**
 * Rede de segurança: mesmo buscando por palavra-chave de casa, a Shopee às
 * vezes casa por termo solto no título e devolve produto fora do tema
 * (ex.: "tênis de corrida leve para casa" caiu numa busca de organização).
 * Qualquer nome de produto que bata com um desses termos é descartado antes
 * de importar, independente da categoria/keyword que trouxe a oferta.
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
  "console",
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
  "maio",
  "whey protein",
  "suplemento alimentar",
  "power bank",
  "carregador portátil",
  "carregador portatil",
  "fone bluetooth",
  "smartwatch",
  "capinha de celular",
  "capa de celular",
  "película de celular",
  "pelicula de celular",
  "roupa fitness",
  "legging fitness",
];

const REGEX_PROIBIDOS = new RegExp(TERMOS_PROIBIDOS.join("|"), "i");

/** true se o nome do produto bater com algum termo fora do tema "casa". */
export function ehForaDoTemaCasa(nomeProduto: string): boolean {
  return REGEX_PROIBIDOS.test(nomeProduto);
}
