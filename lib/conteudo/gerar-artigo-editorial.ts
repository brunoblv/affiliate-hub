import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gerarJson } from "@/lib/conteudo/gemini";
import type { TemaEditorial } from "@/lib/conteudo/pauta-editorial";

export interface ArtigoEditorial {
  titulo: string;
  resumo: string;
  corpo: string;
  seoTitulo: string;
  metaDescricao: string;
}

const SCHEMA_ARTIGO = {
  type: "OBJECT",
  properties: {
    titulo: { type: "STRING" },
    resumo: { type: "STRING" },
    corpo: { type: "STRING" },
    seoTitulo: { type: "STRING" },
    metaDescricao: { type: "STRING" },
  },
  required: ["titulo", "resumo", "corpo", "seoTitulo", "metaDescricao"],
};

const MINIMO_PALAVRAS = 800;

let promptBase: string | null = null;

async function carregarPromptBase(): Promise<string> {
  if (!promptBase) {
    promptBase = await readFile(join(process.cwd(), "prompts", "artigo-editorial.md"), "utf-8");
  }
  return promptBase;
}

function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

function montarPrompt(base: string, tema: TemaEditorial, reforcoTamanho: boolean): string {
  const preenchido = base
    .replace("{{titulo}}", tema.titulo)
    .replace("{{resumoPauta}}", tema.resumoPauta)
    .replace("{{palavraChave}}", tema.palavraChave);

  if (!reforcoTamanho) return preenchido;

  return `${preenchido}\n\n## Atenção\n\nA tentativa anterior ficou curta demais. O corpo tem que ter pelo menos ${MINIMO_PALAVRAS} palavras — desenvolva mais as seções existentes com informação prática real, não repita frases pra encher.`;
}

/** Gera o artigo completo para um tema, com uma tentativa extra se sair curto. */
export async function gerarArtigoEditorial(tema: TemaEditorial): Promise<ArtigoEditorial> {
  const base = await carregarPromptBase();

  for (const reforcoTamanho of [false, true]) {
    const artigo = await gerarJson<ArtigoEditorial>({
      prompt: montarPrompt(base, tema, reforcoTamanho),
      schema: SCHEMA_ARTIGO,
      temperature: 0.9,
    });

    if (contarPalavras(artigo.corpo) >= MINIMO_PALAVRAS) return artigo;
  }

  throw new Error(`Gemini não conseguiu gerar ${MINIMO_PALAVRAS}+ palavras para o tema "${tema.titulo}" em 2 tentativas.`);
}
