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

const MINIMO_PALAVRAS = 600;
const ALVO_PALAVRAS = 850;
const MAX_TENTATIVAS = 3;

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
  rascunhoCurto?: ArtigoEditorial,
): Promise<string> {
  let preenchido = base
    .replace("{{titulo}}", tema.titulo)
    .replace("{{resumoPauta}}", tema.resumoPauta)
    .replace("{{palavraChave}}", tema.palavraChave);

  if (categoria === CategoriaEditorial.JORNADA_APARTAMENTO) {
    preenchido = preenchido.replace("{{contextoJornada}}", await contextoJornada());
  }

  if (!rascunhoCurto) return preenchido;

  const palavras = contarPalavras(rascunhoCurto.corpo);
  return `${preenchido}

## Atenção — expandir o rascunho abaixo

A tentativa anterior ficou com ${palavras} palavras. O piso é ${MINIMO_PALAVRAS}; o alvo é ${ALVO_PALAVRAS}. Não recomece do zero: mantenha o ângulo, os fatos e a voz, e desenvolva cada seção com mais detalhe concreto (rotina, critérios, o que observar, trade-offs, o que faria diferente). Se o tema comportar, acrescente 1 seção nova. Não invente fato pessoal fora do contexto e não repita frases pra encher.

### Rascunho anterior (corpo)

${rascunhoCurto.corpo}`;
}

/** Gera o artigo completo para um tema/categoria, expandindo o rascunho se sair curto. */
export async function gerarArtigoEditorial(tema: TemaEditorial, categoria: CategoriaEditorial): Promise<ArtigoEditorial> {
  const base = await carregarPromptBase(categoria);
  const contagens: number[] = [];
  let rascunhoCurto: ArtigoEditorial | undefined;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const artigo = await gerarJson<ArtigoEditorial>({
      prompt: await montarPrompt(base, tema, categoria, rascunhoCurto),
      schema: SCHEMA_ARTIGO,
      temperature: 0.9,
      maxOutputTokens: 16384,
      tarefa: "artigo",
    });

    const palavras = contarPalavras(artigo.corpo);
    contagens.push(palavras);
    if (palavras >= MINIMO_PALAVRAS) return artigo;
    rascunhoCurto = artigo;
  }

  throw new Error(
    `Gemini não conseguiu gerar ${MINIMO_PALAVRAS}+ palavras para o tema "${tema.titulo}" em ${MAX_TENTATIVAS} tentativas (ficou com ${contagens.join(", ")}).`,
  );
}
