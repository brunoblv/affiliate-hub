import { Categoria, Destino, Plataforma } from "@/lib/database/enums";
import type { Produto } from "@/lib/database";
import { ehForaDoTemaCasa, ehForaDoTemaEspiritualidade } from "@/lib/nicho";

/**
 * Categorias "de casa" do catálogo público do Meu Novo Lar — única fonte de
 * verdade, usada tanto pro filtro de /produtos quanto pros selects de
 * cadastro/import no admin. As demais categorias do enum (BELEZA,
 * ELETRONICOS, MODA, UMBANDA_RELIGIAO, PET, CASA_DECORACAO legado, OUTRA)
 * ficam de fora do catálogo público — ver AGENTS.md/pedido do usuário sobre
 * o catálogo estar desalinhado com o propósito do site.
 */
export const HOME_CATEGORIAS: Categoria[] = [
  Categoria.CASA,
  Categoria.ORGANIZACAO,
  Categoria.COZINHA,
  Categoria.BANHEIRO,
  Categoria.LAVANDERIA,
  Categoria.LIMPEZA,
  Categoria.DECORACAO,
  Categoria.ILUMINACAO,
  Categoria.MOVEIS,
  Categoria.FERRAMENTAS,
  Categoria.JARDIM,
  Categoria.ELETRODOMESTICOS,
];

/**
 * Categorias do catálogo público do Mago da Meia Noite — mesmo papel de
 * HOME_CATEGORIAS, para o destino MAGO_MEIA_NOITE (ver dock/blog.md seção 6
 * "Guias", no repo midnight-mage, para a lista original de itens).
 */
export const MAGO_CATEGORIAS: Categoria[] = [
  Categoria.TAROT,
  Categoria.PEDRAS_CRISTAIS,
  Categoria.VELAS,
  Categoria.INCENSOS,
  Categoria.LIVROS_ESPIRITUALIDADE,
  Categoria.ITENS_ALTAR,
  Categoria.JAPAMALAS,
  Categoria.DECORACAO_ESPIRITUAL,
];

/** Categorias públicas + filtro de nicho por Destino — ver produtoVisivelNoSite. */
const CONFIG_CATALOGO_POR_DESTINO: Partial<
  Record<Destino, { categorias: Categoria[]; foraDoTema: (nome: string) => boolean }>
> = {
  [Destino.MEU_NOVO_LAR]: { categorias: HOME_CATEGORIAS, foraDoTema: ehForaDoTemaCasa },
  [Destino.MAGO_MEIA_NOITE]: { categorias: MAGO_CATEGORIAS, foraDoTema: ehForaDoTemaEspiritualidade },
};

export const LABEL_CATEGORIA: Record<Categoria, string> = {
  CASA: "Casa",
  ORGANIZACAO: "Organização",
  COZINHA: "Cozinha",
  BANHEIRO: "Banheiro",
  LAVANDERIA: "Lavanderia",
  LIMPEZA: "Limpeza",
  DECORACAO: "Decoração",
  ILUMINACAO: "Iluminação",
  MOVEIS: "Móveis",
  FERRAMENTAS: "Ferramentas",
  JARDIM: "Jardim",
  ELETRODOMESTICOS: "Eletrodomésticos",
  BELEZA: "Beleza (legado)",
  CASA_DECORACAO: "Casa e Decoração (legado)",
  ELETRONICOS: "Eletrônicos (legado)",
  MODA: "Moda (legado)",
  UMBANDA_RELIGIAO: "Umbanda e Religião (legado)",
  PET: "Pet (legado)",
  OUTRA: "Outra",
  TAROT: "Tarot",
  PEDRAS_CRISTAIS: "Pedras e Cristais",
  VELAS: "Velas",
  INCENSOS: "Incensos",
  LIVROS_ESPIRITUALIDADE: "Livros de Espiritualidade",
  ITENS_ALTAR: "Itens para Altar",
  JAPAMALAS: "Japamalas",
  DECORACAO_ESPIRITUAL: "Decoração Espiritual",
};

export const LABEL_PLATAFORMA: Record<Plataforma, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

export const OPCOES_PLATAFORMA: Array<{ value: Plataforma; label: string }> = [
  Plataforma.SHOPEE,
  Plataforma.MERCADO_LIVRE,
  Plataforma.AMAZON,
  Plataforma.TIKTOK_SHOP,
].map((value) => ({ value, label: LABEL_PLATAFORMA[value] }));

/** Opções pros `<select>` de categoria no admin — casa e espiritualidade primeiro, legado por último. */
export const OPCOES_CATEGORIA: Array<{ value: Categoria; label: string }> = [
  ...HOME_CATEGORIAS,
  ...MAGO_CATEGORIAS,
  Categoria.BELEZA,
  Categoria.CASA_DECORACAO,
  Categoria.ELETRONICOS,
  Categoria.MODA,
  Categoria.UMBANDA_RELIGIAO,
  Categoria.PET,
  Categoria.OUTRA,
].map((value) => ({ value, label: LABEL_CATEGORIA[value] }));

/** Select de import/cadastro pro catálogo público — sem categorias legado. */
export const OPCOES_CATEGORIA_PUBLICA: Array<{ value: Categoria; label: string }> = HOME_CATEGORIAS.map((value) => ({
  value,
  label: LABEL_CATEGORIA[value],
}));

/** Mesma ideia de OPCOES_CATEGORIA_PUBLICA, mas pro catálogo do Mago da Meia Noite. */
export const OPCOES_CATEGORIA_MAGO: Array<{ value: Categoria; label: string }> = MAGO_CATEGORIAS.map((value) => ({
  value,
  label: LABEL_CATEGORIA[value],
}));

/** Categorias públicas do select de import/cadastro, de acordo com o destino escolhido. */
export function opcoesCategoriaPublicaPorDestino(destino: Destino): Array<{ value: Categoria; label: string }> {
  return (CONFIG_CATALOGO_POR_DESTINO[destino]?.categorias ?? HOME_CATEGORIAS).map((value) => ({
    value,
    label: LABEL_CATEGORIA[value],
  }));
}

/** Pode aparecer em /produtos, /ofertas, home e vitrine do respectivo Destino. */
export function produtoVisivelNoSite(produto: {
  ativo: boolean;
  destino: Destino;
  categoria: Categoria;
  nome: string;
}): boolean {
  const config = CONFIG_CATALOGO_POR_DESTINO[produto.destino];
  if (!config) return false;
  return produto.ativo && config.categorias.includes(produto.categoria) && !config.foraDoTema(produto.nome);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STOPWORDS_CANONICO = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "com",
  "para",
  "por",
  "sem",
  "em",
  "na",
  "no",
  "kit",
  "peca",
  "pecas",
  "und",
  "unidades",
  "promo",
  "promocao",
]);

/**
 * Chave estável pra upsert/dedupe: ignora ordem das palavras no título.
 * Os dois "Varal Secalux 12kg" com texto embaralhado viram a mesma chave —
 * o `-2`/`-3` deixa de nascer.
 */
export function chaveCanonicoProduto(nome: string): string {
  const tokens = slugify(nome)
    .split("-")
    .filter((t) => t.length > 2 && !STOPWORDS_CANONICO.has(t) && !/^\d+$/.test(t));
  return [...new Set(tokens)].sort().join("-");
}

/** true se o slug é uma cópia (`…-2`, `…-3`). */
export function slugTemSufixoNumerico(slug: string): boolean {
  return /-\d+$/.test(slug);
}

/** Prefere a URL sem `-2`/`-3` quando o mesmo produto aparece mais de uma vez. */
export function ehSlugCanonicoMelhor(candidato: string, atual: string): boolean {
  const sufixoCandidato = slugTemSufixoNumerico(candidato);
  const sufixoAtual = slugTemSufixoNumerico(atual);
  if (sufixoCandidato !== sufixoAtual) return sufixoAtual;
  return candidato.length > 0 && candidato.length < atual.length;
}

export function deduplicarCatalogo<T extends { nome: string; slug?: string }>(produtos: T[]): T[] {
  const porChave = new Map<string, T>();
  for (const produto of produtos) {
    const chave = chaveCanonicoProduto(produto.nome);
    if (!chave) continue;
    const atual = porChave.get(chave);
    if (!atual) {
      porChave.set(chave, produto);
      continue;
    }
    if (ehSlugCanonicoMelhor(produto.slug ?? "", atual.slug ?? "")) {
      porChave.set(chave, produto);
    }
  }
  return [...porChave.values()];
}

/** Código curto do /go/:codigo — não precisa ser legível, só único. */
export function gerarCodigoCurto(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** % de desconto entre precoOriginal e precoAtual, ou null se não houver desconto real. */
export function descontoPercentual(produto: Pick<Produto, "precoAtual" | "precoOriginal">): number | null {
  const atual = Number(produto.precoAtual);
  const original = produto.precoOriginal ? Number(produto.precoOriginal) : null;
  if (!original || original <= atual) return null;
  return Math.round(((original - atual) / original) * 100);
}

/** Primeira imagem do produto, ou null se a API não trouxe nenhuma. */
export function primeiraImagem(produto: Pick<Produto, "imagens">): string | null {
  const imagens = (produto.imagens as unknown as string[]) ?? [];
  return imagens[0] ?? null;
}
