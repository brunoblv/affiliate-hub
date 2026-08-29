import { randomBytes } from "node:crypto";
import { Categoria } from "@/lib/database";
import type { Produto } from "@/lib/database";

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
};

/** Opções pros `<select>` de categoria no admin — casa primeiro, legado por último. */
export const OPCOES_CATEGORIA: Array<{ value: Categoria; label: string }> = [
  ...HOME_CATEGORIAS,
  Categoria.BELEZA,
  Categoria.CASA_DECORACAO,
  Categoria.ELETRONICOS,
  Categoria.MODA,
  Categoria.UMBANDA_RELIGIAO,
  Categoria.PET,
  Categoria.OUTRA,
].map((value) => ({ value, label: LABEL_CATEGORIA[value] }));

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Código curto do /go/:codigo — não precisa ser legível, só único. */
export function gerarCodigoCurto(): string {
  return randomBytes(5).toString("base64url");
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
