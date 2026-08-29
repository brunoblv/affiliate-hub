"use server";

import { CategoriaEditorial } from "@/lib/database";
import { gerarTemasEditoriais, type TemaEditorial } from "@/lib/conteudo/pauta-editorial";
import { gerarArtigoEditorial, type ArtigoEditorial } from "@/lib/conteudo/gerar-artigo-editorial";

export type SugerirTemaResultado = { ok: true; tema: TemaEditorial } | { ok: false; erro: string };

export async function sugerirTemaAction(categoria: CategoriaEditorial): Promise<SugerirTemaResultado> {
  try {
    const [tema] = await gerarTemasEditoriais(1, categoria);
    if (!tema) {
      return { ok: false, erro: "Nenhum tema novo veio de volta (tudo colidiu com títulos existentes). Tente de novo." };
    }
    return { ok: true, tema };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao sugerir tema." };
  }
}

export type GerarArtigoResultado = { ok: true; artigo: ArtigoEditorial } | { ok: false; erro: string };

export async function gerarArtigoAction(categoria: CategoriaEditorial, tema: TemaEditorial): Promise<GerarArtigoResultado> {
  try {
    const artigo = await gerarArtigoEditorial(tema, categoria);
    return { ok: true, artigo };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao gerar o artigo." };
  }
}
