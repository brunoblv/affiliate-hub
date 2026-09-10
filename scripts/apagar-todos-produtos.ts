/**
 * Apaga TODOS os produtos do banco (qualquer plataforma) e a ficha (Post
 * tipo PRODUTO) de cada um — mesma lógica de excluirProdutosComPaginas, já
 * usada no botão de exclusão em lote do admin. HistoricoPreco,
 * LinkAfiliadoEtiquetado, ProdutoVendaSnapshot, ItemDePost, Publicacao e
 * Clique somem junto via cascade (são filhos diretos de Produto no schema).
 *
 * NÃO apaga: Post tipo LISTA/JORNADA, ListaOferta, LandingDiaria/LandingProduto
 * (o produtoId vira null lá — onDelete: SetNull), Configuracao, Canal.
 *
 * Uso (no servidor, com DATABASE_URL de produção):
 *   npx tsx scripts/apagar-todos-produtos.ts
 *
 * Pede confirmação digitada — não roda sem isso, mesmo em produção.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { prisma } from "@/lib/database";
import { excluirProdutosComPaginas } from "@/lib/conteudo/excluir-produto";

const LOTE = 100;
const FRASE_CONFIRMACAO = "apagar tudo";

async function confirmar(total: number): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`\nIsso vai apagar ${total} produto(s) e a ficha de cada um. NÃO tem como desfazer.`);
    const resposta = await rl.question(`Digite exatamente "${FRASE_CONFIRMACAO}" pra confirmar: `);
    return resposta.trim().toLowerCase() === FRASE_CONFIRMACAO;
  } finally {
    rl.close();
  }
}

async function main() {
  const total = await prisma.produto.count();
  if (total === 0) {
    console.log("Nenhum produto no banco — nada a fazer.");
    return;
  }

  const ok = await confirmar(total);
  if (!ok) {
    console.log("Confirmação não bateu. Nada foi apagado.");
    return;
  }

  let apagados = 0;
  let paginasApagadas = 0;

  // Sempre pega os primeiros LOTE restantes — a cada volta o produto já
  // apagado sai da contagem, então não precisa de offset/paginação.
  while (true) {
    const lote = await prisma.produto.findMany({ select: { id: true }, take: LOTE });
    if (lote.length === 0) break;

    const { produtos, paginas } = await excluirProdutosComPaginas(lote.map((p) => p.id));
    apagados += produtos.length;
    paginasApagadas += paginas.length;
    console.log(`Apagados até agora: ${apagados}/${total}`);
  }

  console.log(`\nConcluído. Produtos apagados: ${apagados}. Fichas apagadas: ${paginasApagadas}.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
