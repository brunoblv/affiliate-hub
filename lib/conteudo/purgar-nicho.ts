import { prisma, Destino } from "@/lib/database";
import { chaveCanonicoProduto, produtoVisivelNoSite, slugTemSufixoNumerico } from "@/lib/produtos";
import { excluirProdutosComPaginas } from "@/lib/conteudo/excluir-produto";

const LOTE = 100;

export interface ResultadoPurgeNicho {
  foraDoNicho: number;
  duplicatas: number;
  amostrasFora: Array<{ slug: string; nome: string; categoria: string; plataforma: string }>;
}

async function apagarEmLotes(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < ids.length; i += LOTE) {
    const fatia = ids.slice(i, i + LOTE);
    const { produtos } = await excluirProdutosComPaginas(fatia);
    total += produtos.length;
  }
  return total;
}

async function consolidarDuplicatas(): Promise<number> {
  const produtos = await prisma.produto.findMany({
    where: { destino: Destino.MEU_NOVO_LAR },
    select: { id: true, slug: true, nome: true, criadoEm: true },
    orderBy: { criadoEm: "asc" },
  });

  const grupos = new Map<string, typeof produtos>();
  for (const produto of produtos) {
    const chave = chaveCanonicoProduto(produto.nome);
    if (!chave) continue;
    const lista = grupos.get(chave) ?? [];
    lista.push(produto);
    grupos.set(chave, lista);
  }

  const extras: string[] = [];

  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const canonico = grupo.find((p) => !slugTemSufixoNumerico(p.slug)) ?? grupo[0]!;
    const outros = grupo.filter((p) => p.id !== canonico.id);

    for (const extra of outros) {
      await prisma.$transaction(async (tx) => {
        const itens = await tx.itemDePost.findMany({ where: { produtoId: extra.id } });
        for (const item of itens) {
          const jaTem = await tx.itemDePost.findUnique({
            where: { postId_produtoId: { postId: item.postId, produtoId: canonico.id } },
          });
          if (jaTem) {
            await tx.itemDePost.delete({ where: { id: item.id } });
          } else {
            await tx.itemDePost.update({ where: { id: item.id }, data: { produtoId: canonico.id } });
          }
        }

        const landings = await tx.landingProduto.findMany({ where: { produtoId: extra.id } });
        for (const item of landings) {
          const jaTem = await tx.landingProduto.findUnique({
            where: { landingDiariaId_produtoId: { landingDiariaId: item.landingDiariaId, produtoId: canonico.id } },
          });
          if (jaTem) {
            await tx.landingProduto.delete({ where: { id: item.id } });
          } else {
            await tx.landingProduto.update({ where: { id: item.id }, data: { produtoId: canonico.id } });
          }
        }

        await tx.landingDiaria.updateMany({
          where: { heroProdutoId: extra.id },
          data: { heroProdutoId: canonico.id },
        });
        await tx.clique.updateMany({ where: { produtoId: extra.id }, data: { produtoId: canonico.id } });
        await tx.publicacao.updateMany({ where: { produtoId: extra.id }, data: { produtoId: canonico.id } });
        await tx.historicoPreco.updateMany({ where: { produtoId: extra.id }, data: { produtoId: canonico.id } });

        const posts = await tx.post.findMany({
          where: { corpo: { contains: `[produto:${extra.slug}]` } },
          select: { id: true, corpo: true },
        });
        for (const post of posts) {
          await tx.post.update({
            where: { id: post.id },
            data: { corpo: post.corpo.split(`[produto:${extra.slug}]`).join(`[produto:${canonico.slug}]`) },
          });
        }
      });
      extras.push(extra.id);
    }
  }

  return apagarEmLotes(extras);
}

export interface PendenciasAdsense {
  foraDoNicho: number;
  gruposDuplicados: number;
  extrasDuplicados: number;
}

export async function contarPendenciasAdsense(): Promise<PendenciasAdsense> {
  const todos = await prisma.produto.findMany({
    where: { destino: Destino.MEU_NOVO_LAR },
    select: { id: true, slug: true, nome: true, categoria: true, ativo: true, destino: true },
  });

  const foraDoNicho = todos.filter((p) => !produtoVisivelNoSite({ ...p, ativo: true })).length;
  const grupos = new Map<string, number>();
  for (const produto of todos) {
    const chave = chaveCanonicoProduto(produto.nome);
    if (!chave) continue;
    grupos.set(chave, (grupos.get(chave) ?? 0) + 1);
  }
  let gruposDuplicados = 0;
  let extrasDuplicados = 0;
  for (const n of grupos.values()) {
    if (n < 2) continue;
    gruposDuplicados++;
    extrasDuplicados += n - 1;
  }
  return { foraDoNicho, gruposDuplicados, extrasDuplicados };
}

/**
 * Remove do Meu Novo Lar o que não é casa/lar e junta duplicatas no slug canônico.
 * Usado pelo script CLI e pelo botão no admin.
 */
export async function purgarForaDoNichoEDuplicatas(): Promise<ResultadoPurgeNicho> {
  const todos = await prisma.produto.findMany({
    where: { destino: Destino.MEU_NOVO_LAR },
    select: { id: true, slug: true, nome: true, categoria: true, plataforma: true, ativo: true, destino: true },
  });

  const fora = todos.filter((p) => !produtoVisivelNoSite({ ...p, ativo: true }));
  const foraDoNicho = await apagarEmLotes(fora.map((p) => p.id));
  const duplicatas = await consolidarDuplicatas();

  return {
    foraDoNicho,
    duplicatas,
    amostrasFora: fora.slice(0, 30).map((p) => ({
      slug: p.slug,
      nome: p.nome.slice(0, 90),
      categoria: p.categoria,
      plataforma: p.plataforma,
    })),
  };
}
