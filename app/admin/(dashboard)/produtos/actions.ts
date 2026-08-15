"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Destino, Plataforma, TipoPost } from "@/lib/database";
import { gerarCodigoCurto, slugify } from "@/lib/produtos";
import { buscarItemMercadoLivre } from "@/lib/mercado-livre/client";
import { enfileirarProduto, type ResultadoEnfileiramento } from "@/lib/agenda/enfileirar";

export interface ProdutoFormState {
  status: "idle" | "error";
  message?: string;
}

function parseImagens(raw: string): string[] {
  return raw
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function readForm(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const plataforma = String(formData.get("plataforma") ?? "") as Plataforma;
  const destino = String(formData.get("destino") ?? "") as Destino;
  const idExterno = String(formData.get("idExterno") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const precoAtual = String(formData.get("precoAtual") ?? "").trim();
  const precoOriginal = String(formData.get("precoOriginal") ?? "").trim();
  const imagens = parseImagens(String(formData.get("imagens") ?? ""));
  // Regra AGENTS.md: nunca divulgar a URL crua da loja — só o link de afiliado real.
  const linkAfiliado = String(formData.get("linkAfiliado") ?? "").trim();
  const ativo = formData.get("ativo") === "on";

  return { nome, plataforma, destino, idExterno, descricao, precoAtual, precoOriginal, imagens, linkAfiliado, ativo };
}

export async function createProdutoAction(_prev: ProdutoFormState, formData: FormData): Promise<ProdutoFormState> {
  const dados = readForm(formData);

  if (!dados.nome || !dados.idExterno || !dados.precoAtual || !dados.linkAfiliado) {
    return { status: "error", message: "Nome, ID externo, preço e link de afiliado são obrigatórios." };
  }

  const produto = await prisma.produto.create({
    data: {
      plataforma: dados.plataforma,
      destino: dados.destino,
      idExterno: dados.idExterno,
      slug: slugify(dados.nome),
      nome: dados.nome,
      descricao: dados.descricao || null,
      imagens: dados.imagens,
      precoAtual: dados.precoAtual,
      precoOriginal: dados.precoOriginal || null,
      linkAfiliado: dados.linkAfiliado,
      codigoCurto: gerarCodigoCurto(),
      ativo: dados.ativo,
    },
  });

  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${produto.id}`);
}

export async function updateProdutoAction(
  id: string,
  _prev: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  const dados = readForm(formData);

  if (!dados.nome || !dados.idExterno || !dados.precoAtual || !dados.linkAfiliado) {
    return { status: "error", message: "Nome, ID externo, preço e link de afiliado são obrigatórios." };
  }

  await prisma.produto.update({
    where: { id },
    data: {
      plataforma: dados.plataforma,
      destino: dados.destino,
      idExterno: dados.idExterno,
      nome: dados.nome,
      descricao: dados.descricao || null,
      imagens: dados.imagens,
      precoAtual: dados.precoAtual,
      precoOriginal: dados.precoOriginal || null,
      linkAfiliado: dados.linkAfiliado,
      ativo: dados.ativo,
    },
  });

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}`);

  return { status: "idle" };
}

/**
 * Fase 2 (spec §5.1): cola ID + link de afiliado → GET /items/{id} preenche o
 * resto, e um Post PRODUTO em RASCUNHO é criado automaticamente pra revisão.
 * O link de afiliado nunca vem da API — é sempre colado por quem cadastra.
 */
export async function importarMercadoLivreAction(_prev: ProdutoFormState, formData: FormData): Promise<ProdutoFormState> {
  const idExterno = String(formData.get("idExterno") ?? "").trim();
  const linkAfiliado = String(formData.get("linkAfiliado") ?? "").trim();

  if (!idExterno || !linkAfiliado) {
    return { status: "error", message: "ID do anúncio e link de afiliado são obrigatórios." };
  }

  let item;
  try {
    item = await buscarItemMercadoLivre(idExterno);
  } catch (erro) {
    return { status: "error", message: erro instanceof Error ? erro.message : "Falha ao consultar o Mercado Livre." };
  }

  const slug = slugify(item.title);
  const imagens = item.pictures.map((p) => p.url).slice(0, 6);

  const produto = await prisma.produto.create({
    data: {
      plataforma: Plataforma.MERCADO_LIVRE,
      idExterno,
      slug,
      nome: item.title,
      imagens,
      precoAtual: item.price,
      precoOriginal: item.original_price,
      linkAfiliado,
      codigoCurto: gerarCodigoCurto(),
      dadosBrutos: JSON.parse(JSON.stringify(item)),
      sincronizadoEm: new Date(),
    },
  });

  const post = await prisma.post.create({
    data: {
      tipo: TipoPost.PRODUTO,
      titulo: item.title,
      slug: `${slug}-${produto.id.slice(-6)}`,
      corpo: `[produto:${slug}]\n\n`,
    },
  });

  await prisma.itemDePost.create({ data: { postId: post.id, produtoId: produto.id, ordem: 0 } });

  revalidatePath("/admin/produtos");
  redirect(`/admin/posts/${post.id}`);
}

/** Agenda a distribuição do produto em todos os canais ativos (spec §5.2). */
export async function distribuirProdutoAction(produtoId: string): Promise<ResultadoEnfileiramento[]> {
  const resultados = await enfileirarProduto(produtoId);
  revalidatePath("/admin/fila");
  return resultados;
}
