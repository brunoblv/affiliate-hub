import { prisma, Destino, FaixaPreco, SeloLanding, type Categoria, type Produto } from "@/lib/database";
import { descontoPercentual } from "@/lib/produtos";
import type { DadosConfiguracaoVitrine } from "./configuracao";

export interface CandidatoLanding {
  produto: Produto;
  desconto: number | null;
  faixa: FaixaPreco;
  cliquesVitrine: number;
  score: number;
}

export interface ItemCurado {
  produto: Produto;
  faixa: FaixaPreco;
  desconto: number | null;
  cliquesVitrine: number;
  selo: SeloLanding | null;
  hero: boolean;
}

export function classificarFaixa(
  preco: number,
  tetoAcessivel: number,
  tetoIntermediario: number,
): FaixaPreco {
  if (preco <= tetoAcessivel) return FaixaPreco.ACESSIVEL;
  if (preco <= tetoIntermediario) return FaixaPreco.INTERMEDIARIO;
  return FaixaPreco.PREMIUM;
}

function scoreCandidato(desconto: number | null, cliques: number, destaque: boolean): number {
  return (desconto ?? 0) * 2 + cliques * 10 + (destaque ? 80 : 0);
}

/** Conta cliques originados da vitrine — retroalimenta a curadoria (fase 4). */
async function cliquesPorProduto(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();

  const grupos = await prisma.clique.groupBy({
    by: ["produtoId"],
    where: { produtoId: { in: ids }, origem: { startsWith: "vitrine" } },
    _count: { produtoId: true },
  });

  return new Map(grupos.map((g) => [g.produtoId, g._count.produtoId]));
}

function podeEntrar(produto: Produto, descontoMinimoPct: number): boolean {
  if (!produto.ativo) return false;
  if (!produto.linkAfiliado.trim()) return false;
  if (produto.destaqueVitrine) return true;
  const desconto = descontoPercentual(produto);
  return desconto !== null && desconto >= descontoMinimoPct;
}

function selosDosItens(itens: Omit<ItemCurado, "selo">[]): ItemCurado[] {
  const comSelo = itens.map((item) => ({ ...item, selo: null as SeloLanding | null }));
  if (comSelo.length === 0) return comSelo;

  const usado = new Set<string>();

  const maiorDesconto = [...comSelo].sort((a, b) => (b.desconto ?? -1) - (a.desconto ?? -1))[0];
  if (maiorDesconto && (maiorDesconto.desconto ?? 0) > 0) {
    maiorDesconto.selo = SeloLanding.MAIOR_DESCONTO;
    usado.add(maiorDesconto.produto.id);
  }

  const maisVendido = [...comSelo]
    .filter((item) => !usado.has(item.produto.id))
    .sort((a, b) => b.cliquesVitrine - a.cliquesVitrine)[0];
  if (maisVendido && maisVendido.cliquesVitrine > 0) {
    maisVendido.selo = SeloLanding.MAIS_VENDIDO;
    usado.add(maisVendido.produto.id);
  }

  const achadinho = [...comSelo]
    .filter((item) => item.faixa === FaixaPreco.ACESSIVEL && !usado.has(item.produto.id))
    .sort((a, b) => Number(a.produto.precoAtual) - Number(b.produto.precoAtual))[0];
  if (achadinho) {
    achadinho.selo = SeloLanding.ACHADINHO_DO_DIA;
  }

  return comSelo;
}

/**
 * Seleciona o recorte do dia: cota de acessíveis, diversidade de categoria,
 * 1 hero e priorização por desconto + cliques históricos da vitrine.
 */
export async function curarProdutosDoDia(
  destino: Destino,
  config: DadosConfiguracaoVitrine,
): Promise<ItemCurado[]> {
  const produtos = await prisma.produto.findMany({
    where: { destino, ativo: true },
  });

  const elegiveis = produtos.filter((p) => podeEntrar(p, config.descontoMinimoPct));
  const cliques = await cliquesPorProduto(elegiveis.map((p) => p.id));

  const candidatos: CandidatoLanding[] = elegiveis.map((produto) => {
    const desconto = descontoPercentual(produto);
    const cliquesVitrine = cliques.get(produto.id) ?? 0;
    return {
      produto,
      desconto,
      faixa: classificarFaixa(Number(produto.precoAtual), config.tetoAcessivel, config.tetoIntermediario),
      cliquesVitrine,
      score: scoreCandidato(desconto, cliquesVitrine, produto.destaqueVitrine),
    };
  });

  candidatos.sort((a, b) => b.score - a.score || (b.desconto ?? 0) - (a.desconto ?? 0));

  const total = Math.min(config.quantidadeItens, candidatos.length);
  if (total === 0) return [];

  const minAcessiveis = Math.min(
    Math.ceil((total * config.cotaAcessivelPct) / 100),
    candidatos.filter((c) => c.faixa === FaixaPreco.ACESSIVEL).length,
  );

  const escolhidos: CandidatoLanding[] = [];
  const porCategoria = new Map<Categoria, number>();

  const cabe = (c: CandidatoLanding): boolean => {
    if (escolhidos.some((e) => e.produto.id === c.produto.id)) return false;
    return (porCategoria.get(c.produto.categoria) ?? 0) < config.maxPorCategoria;
  };

  const adicionar = (c: CandidatoLanding): void => {
    escolhidos.push(c);
    porCategoria.set(c.produto.categoria, (porCategoria.get(c.produto.categoria) ?? 0) + 1);
  };

  const hero = candidatos.find(cabe);
  if (hero) adicionar(hero);

  for (const c of candidatos) {
    if (escolhidos.length >= total) break;
    if (c.faixa !== FaixaPreco.ACESSIVEL) continue;
    if (escolhidos.filter((e) => e.faixa === FaixaPreco.ACESSIVEL).length >= minAcessiveis) break;
    if (cabe(c)) adicionar(c);
  }

  for (const c of candidatos) {
    if (escolhidos.length >= total) break;
    if (cabe(c)) adicionar(c);
  }

  // Se a cota de acessíveis ainda não fechou, troca o pior não-acessível por um acessível que couber.
  const acessiveisUsados = escolhidos.filter((e) => e.faixa === FaixaPreco.ACESSIVEL).length;
  if (acessiveisUsados < minAcessiveis) {
    const reservas = candidatos.filter((c) => c.faixa === FaixaPreco.ACESSIVEL && cabe(c));
    for (const reserva of reservas) {
      if (escolhidos.filter((e) => e.faixa === FaixaPreco.ACESSIVEL).length >= minAcessiveis) break;
      const pior = [...escolhidos]
        .filter((e) => e.faixa !== FaixaPreco.ACESSIVEL && !e.produto.destaqueVitrine)
        .sort((a, b) => a.score - b.score)[0];
      if (!pior) break;
      const idx = escolhidos.indexOf(pior);
      porCategoria.set(pior.produto.categoria, (porCategoria.get(pior.produto.categoria) ?? 1) - 1);
      escolhidos.splice(idx, 1);
      adicionar(reserva);
    }
  }

  const itens: Omit<ItemCurado, "selo">[] = escolhidos.map((c, i) => ({
    produto: c.produto,
    faixa: c.faixa,
    desconto: c.desconto,
    cliquesVitrine: c.cliquesVitrine,
    hero: i === 0,
  }));

  return selosDosItens(itens);
}
