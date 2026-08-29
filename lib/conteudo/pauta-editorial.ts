import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma, TipoPost, CategoriaEditorial } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
import { contextoJornada } from "@/lib/conteudo/jornada";
import { slugify } from "@/lib/produtos";

export interface TemaEditorial {
  titulo: string;
  resumoPauta: string;
  palavraChave: string;
}

const SCHEMA_PAUTA = {
  type: "OBJECT",
  properties: {
    temas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titulo: { type: "STRING" },
          resumoPauta: { type: "STRING" },
          palavraChave: { type: "STRING" },
        },
        required: ["titulo", "resumoPauta", "palavraChave"],
      },
    },
  },
  required: ["temas"],
};

const ARQUIVO_POR_CATEGORIA: Record<CategoriaEditorial, string> = {
  [CategoriaEditorial.DICAS_CASA]: "pauta-editorial.md",
  [CategoriaEditorial.JORNADA_APARTAMENTO]: "pauta-jornada-apartamento.md",
};

const promptsCarregados = new Map<string, string>();

async function carregarPromptBase(categoria: CategoriaEditorial): Promise<string> {
  const arquivo = ARQUIVO_POR_CATEGORIA[categoria];
  const cache = promptsCarregados.get(arquivo);
  if (cache) return cache;

  const conteudo = await readFile(join(process.cwd(), "prompts", arquivo), "utf-8");
  promptsCarregados.set(arquivo, conteudo);
  return conteudo;
}

/**
 * Pede N temas novos ao Gemini para a `categoria` dada, evitando repetir o
 * que o blog já tem nessa mesma categoria (publicado ou rascunho). Sempre
 * pede uma folga (mais do que `quantidade`) porque parte pode colidir com
 * títulos existentes depois do slugify.
 */
export async function gerarTemasEditoriais(quantidade: number, categoria: CategoriaEditorial): Promise<TemaEditorial[]> {
  const existentes = await prisma.post.findMany({
    where: { tipo: TipoPost.JORNADA, categoriaEditorial: categoria },
    select: { titulo: true, slug: true },
    orderBy: { criadoEm: "desc" },
  });

  const slugsExistentes = new Set(existentes.map((post) => post.slug));
  const prompt = await carregarPromptBase(categoria);

  const listaExistentes =
    existentes.length > 0
      ? existentes.map((post) => `- ${post.titulo}`).join("\n")
      : "(nenhum artigo publicado ainda nessa categoria — pode propor qualquer tema dentro da linha editorial)";

  let promptCompleto = `${prompt}\n\n## Títulos já existentes no site (nessa categoria)\n\n${listaExistentes}\n\n## Pedido\n\nGere ${quantidade + 5} temas novos (peço uma folga porque alguns podem ser descartados por semelhança com os já existentes).`;

  if (categoria === CategoriaEditorial.JORNADA_APARTAMENTO) {
    promptCompleto = promptCompleto.replace("{{contextoJornada}}", await contextoJornada());
  }

  const { temas } = await gerarJson<{ temas: TemaEditorial[] }>({
    prompt: promptCompleto,
    schema: SCHEMA_PAUTA,
    temperature: 1,
  });

  const vistos = new Set<string>();
  const selecionados: TemaEditorial[] = [];

  for (const tema of temas) {
    if (!tema.titulo?.trim()) continue;
    const slug = slugify(tema.titulo);
    if (!slug || slugsExistentes.has(slug) || vistos.has(slug)) continue;

    vistos.add(slug);
    selecionados.push(tema);
    if (selecionados.length >= quantidade) break;
  }

  return selecionados;
}
