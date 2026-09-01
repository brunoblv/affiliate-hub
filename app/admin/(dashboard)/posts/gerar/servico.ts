import { CategoriaEditorial } from "@/lib/database";
import { gerarTemasEditoriais, type TemaEditorial } from "@/lib/conteudo/pauta-editorial";
import { gerarArtigoEditorial } from "@/lib/conteudo/gerar-artigo-editorial";
import type { GerarArtigoResultado, SugerirTemaResultado } from "./tipos";

export function ehCategoriaEditorial(valor: unknown): valor is CategoriaEditorial {
  return valor === CategoriaEditorial.DICAS_CASA || valor === CategoriaEditorial.JORNADA_APARTAMENTO;
}

export function ehTemaEditorial(valor: unknown): valor is TemaEditorial {
  if (!valor || typeof valor !== "object") return false;
  const tema = valor as Record<string, unknown>;
  return (
    typeof tema.titulo === "string" &&
    typeof tema.resumoPauta === "string" &&
    typeof tema.palavraChave === "string"
  );
}

export async function sugerirTema(categoria: CategoriaEditorial): Promise<SugerirTemaResultado> {
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

export async function gerarArtigo(categoria: CategoriaEditorial, tema: TemaEditorial): Promise<GerarArtigoResultado> {
  try {
    const artigo = await gerarArtigoEditorial(tema, categoria);
    return { ok: true, artigo };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao gerar o artigo." };
  }
}
