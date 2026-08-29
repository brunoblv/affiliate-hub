import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CategoriaEditorial } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
import { contextoJornada } from "@/lib/conteudo/jornada";
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

const ARQUIVO_POR_CATEGORIA: Record<CategoriaEditorial, string> = {
  [CategoriaEditorial.DICAS_CASA]: "artigo-editorial.md",
  [CategoriaEditorial.JORNADA_APARTAMENTO]: "artigo-jornada-apartamento.md",
};

/**
 * Os prompts em `prompts/*.md` exigem um bloco de opinião/vivência própria em
 * todo artigo (regra "Bloco de opinião/critério próprio") — é o que evita o
 * texto sair genérico. Editar essa exigência ali, não aqui.
 */
const promptsCarregados = new Map<string, string>();

async function carregarPromptBase(categoria: CategoriaEditorial): Promise<string> {
  const arquivo = ARQUIVO_POR_CATEGORIA[categoria];
  const cache = promptsCarregados.get(arquivo);
  if (cache) return cache;

  const conteudo = await readFile(join(process.cwd(), "prompts", arquivo), "utf-8");
  promptsCarregados.set(arquivo, conteudo);
  return conteudo;
}

function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

async function montarPrompt(
  base: string,
  tema: TemaEditorial,
  categoria: CategoriaEditorial,
  reforcoTamanho: boolean,
): Promise<string> {
  let preenchido = base
    .replace("{{titulo}}", tema.titulo)
    .replace("{{resumoPauta}}", tema.resumoPauta)
    .replace("{{palavraChave}}", tema.palavraChave);

  if (categoria === CategoriaEditorial.JORNADA_APARTAMENTO) {
    preenchido = preenchido.replace("{{contextoJornada}}", await contextoJornada());
  }

  if (!reforcoTamanho) return preenchido;

  return `${preenchido}\n\n## Atenção\n\nA tentativa anterior ficou curta demais. O corpo tem que ter pelo menos ${MINIMO_PALAVRAS} palavras — desenvolva mais as seções existentes com informação prática real, não repita frases pra encher.`;
}

/** Gera o artigo completo para um tema/categoria, com uma tentativa extra se sair curto. */
export async function gerarArtigoEditorial(tema: TemaEditorial, categoria: CategoriaEditorial): Promise<ArtigoEditorial> {
  const base = await carregarPromptBase(categoria);

  for (const reforcoTamanho of [false, true]) {
    const artigo = await gerarJson<ArtigoEditorial>({
      prompt: await montarPrompt(base, tema, categoria, reforcoTamanho),
      schema: SCHEMA_ARTIGO,
      temperature: 0.9,
    });

    if (contarPalavras(artigo.corpo) >= MINIMO_PALAVRAS) return artigo;
  }

  throw new Error(`Gemini não conseguiu gerar ${MINIMO_PALAVRAS}+ palavras para o tema "${tema.titulo}" em 2 tentativas.`);
}
