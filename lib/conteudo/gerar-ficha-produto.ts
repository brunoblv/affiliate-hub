import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma, type Produto } from "@/lib/database";
import { gerarJson } from "@/lib/conteudo/gemini";
import { LABEL_CATEGORIA } from "@/lib/produtos";
import { LABEL_DESTINO } from "@/lib/vitrine/destinos";

export interface FichaProduto {
  descricao: string;
  utilidade: string;
  resumo: string;
  notaEditorial: string;
}

const SCHEMA_FICHA = {
  type: "OBJECT",
  properties: {
    descricao: { type: "STRING" },
    utilidade: { type: "STRING" },
    resumo: { type: "STRING" },
    notaEditorial: { type: "STRING" },
  },
  required: ["descricao", "utilidade", "resumo", "notaEditorial"],
};

const LABEL_PLATAFORMA: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

let promptBase: string | null = null;

async function carregarPrompt(): Promise<string> {
  if (promptBase) return promptBase;
  promptBase = await readFile(join(process.cwd(), "prompts", "ficha-produto.md"), "utf-8");
  return promptBase;
}

/** Tira HTML e comprime espaço — descrição de marketplace costuma vir suja. */
export function textoLimpoDaDescricao(bruta: string | null | undefined, limite = 1500): string {
  if (!bruta) return "";
  const limpo = bruta
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite)}…`;
}

export function montarCorpoFichaProduto(slug: string, ficha: Pick<FichaProduto, "descricao" | "utilidade">): string {
  return `${ficha.descricao.trim()}

## Para que serve

${ficha.utilidade.trim()}

[produto:${slug}]
`;
}

export async function gerarFichaProduto(produto: Produto): Promise<FichaProduto> {
  const base = await carregarPrompt();
  const prompt = base
    .replace("{{nome}}", produto.nome)
    .replace("{{categoria}}", LABEL_CATEGORIA[produto.categoria] ?? produto.categoria)
    .replace("{{destino}}", LABEL_DESTINO[produto.destino] ?? produto.destino)
    .replace("{{plataforma}}", LABEL_PLATAFORMA[produto.plataforma] ?? produto.plataforma)
    .replace("{{descricao}}", textoLimpoDaDescricao(produto.descricao) || "(sem descrição da loja)")
    .replace("{{notaEditorial}}", produto.notaEditorial?.trim() || "(nenhuma)");

  return gerarJson<FichaProduto>({
    prompt,
    schema: SCHEMA_FICHA,
    temperature: 0.7,
    tarefa: "curto",
    maxOutputTokens: 2048,
  });
}

/** Preenche descrição/nota só quando o cadastro ainda está vazio — não sobrescreve curadoria. */
export async function preencherCamposVaziosDoProduto(produtoId: string, ficha: FichaProduto): Promise<void> {
  const atual = await prisma.produto.findUnique({
    where: { id: produtoId },
    select: { descricao: true, notaEditorial: true },
  });
  if (!atual) return;

  const descricao = atual.descricao?.trim() ? undefined : ficha.descricao.trim();
  const notaEditorial = atual.notaEditorial?.trim() ? undefined : ficha.notaEditorial.trim();
  if (!descricao && !notaEditorial) return;

  await prisma.produto.update({
    where: { id: produtoId },
    data: {
      ...(descricao ? { descricao } : {}),
      ...(notaEditorial ? { notaEditorial } : {}),
    },
  });
}
