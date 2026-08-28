import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma, TipoPost } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
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

let promptBase: string | null = null;

async function carregarPromptBase(): Promise<string> {
  if (!promptBase) {
    promptBase = await readFile(join(process.cwd(), "prompts", "pauta-editorial.md"), "utf-8");
  }
  return promptBase;
}

/**
 * Pede N temas novos ao Gemini, evitando repetir o que o blog já tem
 * (publicado ou rascunho). Sempre pede uma folga (mais do que `quantidade`)
 * porque parte pode colidir com títulos existentes depois do slugify.
 */
export async function gerarTemasEditoriais(quantidade: number): Promise<TemaEditorial[]> {
  const existentes = await prisma.post.findMany({
    where: { tipo: TipoPost.JORNADA },
    select: { titulo: true, slug: true },
    orderBy: { criadoEm: "desc" },
  });

  const slugsExistentes = new Set(existentes.map((post) => post.slug));
  const prompt = await carregarPromptBase();

  const listaExistentes =
    existentes.length > 0
      ? existentes.map((post) => `- ${post.titulo}`).join("\n")
      : "(nenhum artigo publicado ainda — pode propor qualquer tema dentro da linha editorial)";

  const promptCompleto = `${prompt}\n\n## Títulos já existentes no site\n\n${listaExistentes}\n\n## Pedido\n\nGere ${quantidade + 5} temas novos (peço uma folga porque alguns podem ser descartados por semelhança com os já existentes).`;

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
