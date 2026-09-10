/**
 * Rede de segurança do nicho "casa/lar" do Meu Novo Lar.
 * Categoria no enum não basta: import automático (e recategorização errada)
 * coloca skincare, suplemento e eletrônico em CASA. O título decide.
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
  "creatina",
  "pre-treino",
  "pré-treino",
  "power bank",
  "carregador portátil",
  "carregador portatil",
  "fone bluetooth",
  "fone de ouvido",
  "airpods",
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
  "ipad",
  "xiaomi",
  "notebook",
  "macbook",
  "chromebook",
  "galaxy tab",
  "galaxy watch",
  "smart tv",
  "smarttv",
  "smartphone",
  "tablet samsung",
  "medicube",
  "skincare",
  "creme facial",
  "sérum facial",
  "serum facial",
  "protetor solar facial",
  "maquiagem",
  "batom",
  "barbie",
  "lençol de time",
  "lencol de time",
  "jogo de cama time",
];

const REGEX_PROIBIDOS = new RegExp(
  `\\b(?:${TERMOS_PROIBIDOS.map((termo) => termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

/** true se o nome do produto bater com algum termo fora do tema "casa". */
export function ehForaDoTemaCasa(nomeProduto: string): boolean {
  return REGEX_PROIBIDOS.test(nomeProduto);
}

/**
 * Slug legado do schema v1 (`/produtos/mercado_livre-mlb123`).
 * Sem isso o catálogo antigo (e o crawler) cai em 404 mesmo com o item no banco.
 */
/**
 * Rede de segurança do nicho "espiritualidade" do Mago da Meia Noite --
 * mesma logica de ehForaDoTemaCasa, mas bloqueando o que claramente nao e
 * tarot/pedras/velas/incensos/livros/itens de altar (eletronico, moda,
 * suplemento etc.).
 */
const TERMOS_PROIBIDOS_ESPIRITUALIDADE = [
  "iphone",
  "ipad",
  "xiaomi",
  "notebook",
  "macbook",
  "smartphone",
  "smart tv",
  "smarttv",
  "fone bluetooth",
  "fone de ouvido",
  "airpods",
  "smartwatch",
  "relogio inteligente",
  "capinha de celular",
  "capa de celular",
  "pelicula de celular",
  "videogame",
  "video game",
  "xbox",
  "playstation",
  "nintendo",
  "joystick",
  "whey protein",
  "suplemento alimentar",
  "creatina",
  "pre-treino",
  "tenis",
  "chuteira",
  "sutia",
  "calcinha",
  "biquini",
  "geladeira",
  "fogao",
  "microondas",
  "aspirador de po",
];

const REGEX_PROIBIDOS_ESPIRITUALIDADE = new RegExp(
  `\\b(?:${TERMOS_PROIBIDOS_ESPIRITUALIDADE.map((termo) => termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

/** true se o nome do produto bater com algum termo fora do tema "espiritualidade". */
export function ehForaDoTemaEspiritualidade(nomeProduto: string): boolean {
  return REGEX_PROIBIDOS_ESPIRITUALIDADE.test(nomeProduto);
}

export function idExternoDeSlugMercadoLivre(slug: string): string | null {
  const casamento = /^mercado_livre-(mlb\d+)$/i.exec(slug.trim());
  return casamento?.[1]?.toUpperCase() ?? null;
}
