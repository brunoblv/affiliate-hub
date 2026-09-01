import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CategoriaEditorial } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
import { contextoJornada } from "@/lib/conteudo/jornada";

export interface PostParaEditar {
  titulo: string;
  resumo: string | null;
  corpo: string;
  categoriaEditorial: CategoriaEditorial | null;
}

const SCHEMA_REVISAO = {
  type: "OBJECT",
  properties: {
    corpoRevisado: { type: "STRING" },
  },
  required: ["corpoRevisado"],
};

const ARQUIVO_POR_CATEGORIA: Record<CategoriaEditorial, string> = {
  [CategoriaEditorial.DICAS_CASA]: "adicionar-opiniao-dicas-casa.md",
  [CategoriaEditorial.JORNADA_APARTAMENTO]: "adicionar-opiniao-jornada-apartamento.md",
};

const promptsCarregados = new Map<string, string>();

async function carregarPromptBase(arquivo: string): Promise<string> {
  const cache = promptsCarregados.get(arquivo);
  if (cache) return cache;

  const conteudo = await readFile(join(process.cwd(), "prompts", arquivo), "utf-8");
  promptsCarregados.set(arquivo, conteudo);
  return conteudo;
}

/** Insere 1-2 parágrafos de opinião/vivência num artigo já publicado, preservando o resto do corpo. */
export async function adicionarOpiniao(post: PostParaEditar): Promise<string> {
  const categoria = post.categoriaEditorial ?? CategoriaEditorial.DICAS_CASA;
  const arquivo = ARQUIVO_POR_CATEGORIA[categoria];
  const base = await carregarPromptBase(arquivo);

  let prompt = base
    .replace("{{titulo}}", post.titulo)
    .replace("{{resumo}}", post.resumo ?? "(sem resumo)")
    .replace("{{corpoAtual}}", post.corpo);

  if (categoria === CategoriaEditorial.JORNADA_APARTAMENTO) {
    prompt = prompt.replace("{{contextoJornada}}", await contextoJornada());
  }

  const resultado = await gerarJson<{ corpoRevisado: string }>({
    prompt,
    schema: SCHEMA_REVISAO,
    temperature: 0.8,
    tarefa: "artigo",
  });

  return resultado.corpoRevisado;
}
