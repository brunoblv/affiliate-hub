import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Categoria } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
import { HOME_CATEGORIAS, slugify } from "@/lib/produtos";
import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";

export interface TemaLarSmartInterpretado {
  titulo: string;
  angulo: string;
  termosNome: string[];
  categoriasSugeridas: Categoria[];
  quantidade: 4 | 5;
}

interface RespostaGemini {
  titulo: string;
  angulo: string;
  termosNome: string[];
  categoriasSugeridas: string[];
  quantidade: number;
}

const SCHEMA_TEMA = {
  type: "OBJECT",
  properties: {
    titulo: { type: "STRING" },
    angulo: { type: "STRING" },
    termosNome: { type: "ARRAY", items: { type: "STRING" } },
    categoriasSugeridas: { type: "ARRAY", items: { type: "STRING" } },
    quantidade: { type: "INTEGER" },
  },
  required: ["titulo", "angulo", "termosNome", "categoriasSugeridas", "quantidade"],
};

const CATEGORIAS_VALIDAS = new Set<string>(HOME_CATEGORIAS);
const CATEGORIAS_PADRAO: Categoria[] = [Categoria.CASA, Categoria.DECORACAO];

let promptBase: string | null = null;

async function carregarPrompt(): Promise<string> {
  if (promptBase) return promptBase;
  promptBase = await readFile(join(process.cwd(), "prompts", "larsmart-interpretar-tema.md"), "utf-8");
  return promptBase;
}

/** Interpreta a ideia livre do admin: título, ângulo, termos e categorias — nunca escreve o artigo em si. */
export async function interpretarTemaLarSmart(topico: string): Promise<TemaLarSmartInterpretado> {
  const limpo = topico.trim();
  if (!limpo) throw new Error("Digite uma ideia de artigo antes de gerar.");

  const base = await carregarPrompt();
  const prompt = base.replace("{{topico}}", limpo);

  const resposta = await gerarJson<RespostaGemini>({
    prompt,
    schema: SCHEMA_TEMA,
    temperature: 0.6,
    maxOutputTokens: 2048,
    tarefa: "curto",
  });

  const categoriasSugeridas = resposta.categoriasSugeridas
    .map((c) => c.trim().toUpperCase())
    .filter((c): c is Categoria => CATEGORIAS_VALIDAS.has(c));

  const termosNome = [...new Set(resposta.termosNome.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (termosNome.length === 0) {
    throw new Error("Não consegui extrair termos de produto desse tema. Descreva a ideia com mais detalhe.");
  }

  return {
    titulo: resposta.titulo.trim() || limpo,
    angulo: resposta.angulo.trim() || limpo,
    termosNome,
    categoriasSugeridas: categoriasSugeridas.length > 0 ? categoriasSugeridas : CATEGORIAS_PADRAO,
    quantidade: resposta.quantidade === 4 ? 4 : 5,
  };
}

/** Monta uma pauta sintética no mesmo formato usado por gerar-lista, pra reaproveitar toda a seleção/geração existente. */
export function pautaAdHocDoTema(tema: TemaLarSmartInterpretado): PautaListaCasa {
  return {
    id: `larsmart-${slugify(tema.titulo)}`,
    grupo: "tema",
    titulo: tema.titulo,
    angulo: tema.angulo,
    categorias: tema.categoriasSugeridas,
    termosNome: tema.termosNome,
    quantidade: tema.quantidade,
    preferirPromocao: false,
    avisoSeguranca: false,
  };
}
