import { prisma, Plataforma } from "@/lib/database";
import { excluirProdutosComPaginas } from "@/lib/conteudo/excluir-produto";

const LOTE = 100;

/**
 * Escopo: só produto Shopee com `vendas` já preenchido (motor de produtos,
 * Fase 1) — `vendas: null` (nunca classificado) nunca entra, mesmo que o
 * threshold seja alto, porque não sabemos se ele vende pouco ou só não foi
 * sincronizado ainda.
 */
function whereVendasAbaixoDe(limite: number) {
  return { plataforma: Plataforma.SHOPEE, vendas: { not: null, lt: limite } } as const;
}

export async function contarProdutosVendasAbaixoDe(limite: number): Promise<number> {
  return prisma.produto.count({ where: whereVendasAbaixoDe(limite) });
}

export interface ResultadoExclusaoVendasBaixas {
  total: number;
  amostras: Array<{ nome: string; vendas: number | null }>;
}

export async function excluirProdutosVendasAbaixoDe(limite: number): Promise<ResultadoExclusaoVendasBaixas> {
  const candidatos = await prisma.produto.findMany({
    where: whereVendasAbaixoDe(limite),
    select: { id: true, nome: true, vendas: true },
  });

  const amostras = candidatos.slice(0, 20).map((p) => ({ nome: p.nome.slice(0, 90), vendas: p.vendas }));

  let total = 0;
  const ids = candidatos.map((p) => p.id);
  for (let i = 0; i < ids.length; i += LOTE) {
    const fatia = ids.slice(i, i + LOTE);
    const { produtos } = await excluirProdutosComPaginas(fatia);
    total += produtos.length;
  }

  return { total, amostras };
}
