import { randomBytes } from "node:crypto";
import type { Produto } from "@/lib/database";

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
