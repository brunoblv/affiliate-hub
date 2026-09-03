import { prisma, Destino, TipoPost, type Categoria } from "@/lib/database";
import { slugify, HOME_CATEGORIAS, produtoVisivelNoSite } from "@/lib/produtos";
import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";

export interface ProdutoCandidatoLista {
  id: string;
  slug: string;
  nome: string;
  categoria: Categoria;
  destino: Destino;
  ativo: boolean;
  descricao: string | null;
  precoAtual: unknown;
  precoOriginal: unknown;
  imagens: unknown;
  criadoEm: Date;
  linkAfiliado: string;
}

const JANELA_USADOS_MS = 45 * 24 * 60 * 60 * 1000;

function temLinkAfiliado(produto: { linkAfiliado: string }): boolean {
  return Boolean(produto.linkAfiliado.trim());
}

function nomeCombina(nome: string, termos: string[]): boolean {
  if (termos.length === 0) return false;
  const alvo = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return termos.some((termo) => {
    const t = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return alvo.includes(t);
  });
}

function temDesconto(produto: Pick<ProdutoCandidatoLista, "precoAtual" | "precoOriginal">): boolean {
  const atual = Number(produto.precoAtual);
  const original = produto.precoOriginal ? Number(produto.precoOriginal) : 0;
  return Boolean(original && original > atual);
}

function temImagem(produto: Pick<ProdutoCandidatoLista, "imagens">): boolean {
  return Array.isArray(produto.imagens) && produto.imagens.length > 0;
}

function familia(nome: string): string {
  return slugify(nome).split("-").slice(0, 2).join("-") || slugify(nome);
}

function pontuar(produto: ProdutoCandidatoLista, pauta: PautaListaCasa, usados: Set<string>): number {
  let pontos = 0;
  if (nomeCombina(produto.nome, pauta.termosNome)) pontos += 24;
  if (temDesconto(produto)) pontos += pauta.preferirPromocao ? 18 : 8;
  if (temImagem(produto)) pontos += 6;
  if (produto.descricao?.trim()) pontos += 3;
  if (usados.has(produto.id)) pontos -= 16;
  const idadeDias = (Date.now() - produto.criadoEm.getTime()) / (24 * 60 * 60 * 1000);
  if (idadeDias <= 21) pontos += 4;
  return pontos;
}

export async function produtosElegiveisParaLista(): Promise<ProdutoCandidatoLista[]> {
  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      destino: Destino.MEU_NOVO_LAR,
      categoria: { in: HOME_CATEGORIAS },
      NOT: { linkAfiliado: "" },
    },
    select: {
      id: true,
      slug: true,
      nome: true,
      categoria: true,
      descricao: true,
      precoAtual: true,
      precoOriginal: true,
      imagens: true,
      criadoEm: true,
      destino: true,
      ativo: true,
      linkAfiliado: true,
    },
    orderBy: { criadoEm: "desc" },
  });
  return produtos.filter((p) => temLinkAfiliado(p) && produtoVisivelNoSite(p));
}

async function idsUsadosEmListasRecentes(): Promise<Set<string>> {
  const desde = new Date(Date.now() - JANELA_USADOS_MS);
  const itens = await prisma.itemDePost.findMany({
    where: {
      post: { tipo: TipoPost.LISTA, criadoEm: { gte: desde } },
    },
    select: { produtoId: true },
  });
  return new Set(itens.map((item) => item.produtoId));
}

/**
 * Escolhe produtos da pauta: categoria certa, link de afiliado obrigatório,
 * prioriza nome do cômodo/tema e promoção. Evita 5 itens da mesma "família".
 */
export async function escolherProdutosDaPauta(
  pauta: PautaListaCasa,
  pool?: ProdutoCandidatoLista[],
): Promise<ProdutoCandidatoLista[]> {
  const todos = pool ?? (await produtosElegiveisParaLista());
  const usados = await idsUsadosEmListasRecentes();
  const categorias = new Set(pauta.categorias);
  const candidatos = todos.filter((p) => categorias.has(p.categoria));

  const ranqueados = [...candidatos].sort((a, b) => pontuar(b, pauta, usados) - pontuar(a, pauta, usados));
  const comTermo = pauta.termosNome.length === 0 ? ranqueados : ranqueados.filter((p) => nomeCombina(p.nome, pauta.termosNome));
  const semTermo = pauta.termosNome.length === 0 ? [] : ranqueados.filter((p) => !nomeCombina(p.nome, pauta.termosNome));

  const escolhidos: ProdutoCandidatoLista[] = [];
  const familias = new Set<string>();

  function puxar(fonte: ProdutoCandidatoLista[], unicaFamilia: boolean) {
    for (const produto of fonte) {
      if (escolhidos.length >= pauta.quantidade) break;
      if (escolhidos.some((e) => e.id === produto.id)) continue;
      const chave = familia(produto.nome);
      if (unicaFamilia && familias.has(chave)) continue;
      familias.add(chave);
      escolhidos.push(produto);
    }
  }

  puxar(comTermo, true);
  puxar(semTermo, true);
  puxar(ranqueados, false);

  if (pauta.preferirPromocao) {
    const emPromo = escolhidos.filter(temDesconto);
    if (emPromo.length >= 3) return emPromo.slice(0, pauta.quantidade);
  }

  return escolhidos.slice(0, pauta.quantidade);
}

export function contarProdutosDaPauta(pauta: PautaListaCasa, pool: ProdutoCandidatoLista[]): number {
  const categorias = new Set(pauta.categorias);
  return pool.filter((p) => categorias.has(p.categoria)).length;
}
