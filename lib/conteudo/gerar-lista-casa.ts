import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gerarJson } from "@/lib/conteudo/gemini";
import { garantirShortcodesNoCorpo } from "@/lib/conteudo/corpo";
import { LABEL_CATEGORIA } from "@/lib/produtos";
import { textoLimpoDaDescricao } from "@/lib/conteudo/gerar-ficha-produto";
import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";
import type { ProdutoCandidatoLista } from "@/lib/conteudo/escolher-produtos-lista";

export interface ArtigoListaCasa {
  titulo: string;
  resumo: string;
  corpo: string;
  seoTitulo: string;
  metaDescricao: string;
}

const SCHEMA_LISTA = {
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

let promptBase: string | null = null;

async function carregarPrompt(): Promise<string> {
  if (promptBase) return promptBase;
  promptBase = await readFile(join(process.cwd(), "prompts", "lista-casa.md"), "utf-8");
  return promptBase;
}

function blocoProduto(produto: ProdutoCandidatoLista, indice: number): string {
  const descricao = textoLimpoDaDescricao(produto.descricao, 280) || "(sem descrição da loja — fale só da utilidade típica, sem inventar spec)";
  return [
    `${indice}. slug: ${produto.slug}`,
    `   nome: ${produto.nome}`,
    `   categoria: ${LABEL_CATEGORIA[produto.categoria] ?? produto.categoria}`,
    `   descricao: ${descricao}`,
  ].join("\n");
}

/** Gemini escreve utilidade + shortcodes; preço e link de afiliado ficam no card. */
export async function gerarArtigoListaCasa(
  pauta: PautaListaCasa,
  produtos: ProdutoCandidatoLista[],
): Promise<ArtigoListaCasa> {
  if (produtos.length < 3) {
    throw new Error(
      `Poucos produtos no catálogo pra "${pauta.titulo}" (achei ${produtos.length}, preciso de pelo menos 3 com link de afiliado). Importe mais itens desse cômodo/tema.`,
    );
  }

  const base = await carregarPrompt();
  const prompt = base
    .replace("{{titulo}}", pauta.titulo)
    .replace("{{angulo}}", pauta.angulo)
    .replace("{{quantidade}}", String(produtos.length))
    .replace("{{produtos}}", produtos.map((produto, i) => blocoProduto(produto, i + 1)).join("\n\n"));

  const artigo = await gerarJson<ArtigoListaCasa>({
    prompt,
    schema: SCHEMA_LISTA,
    temperature: 0.85,
    maxOutputTokens: 8192,
    tarefa: "artigo",
  });

  const slugs = produtos.map((p) => p.slug);
  return {
    titulo: artigo.titulo.trim() || pauta.titulo,
    resumo: artigo.resumo.trim(),
    corpo: garantirShortcodesNoCorpo(artigo.corpo, slugs),
    seoTitulo: artigo.seoTitulo.trim() || artigo.titulo.trim() || pauta.titulo,
    metaDescricao: artigo.metaDescricao.trim() || artigo.resumo.trim(),
  };
}
