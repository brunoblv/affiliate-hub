"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Destino, Plataforma } from "@/lib/database";
import { gerarCodigoCurto, slugify } from "@/lib/produtos";
import { buscarItemMercadoLivre } from "@/lib/mercado-livre/client";
import { enfileirarProduto, type ResultadoEnfileiramento } from "@/lib/agenda/enfileirar";
import { garantirPostPublicadoDoProduto } from "@/lib/conteudo/post-do-produto";

export interface ProdutoFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

/** Home, /ofertas e /produtos listam produto e preço — todas ficam velhas junto. */
function revalidarSitePublico(slug: string): void {
  revalidatePath("/");
  revalidatePath("/ofertas");
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${slug}`);
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

  await garantirPostPublicadoDoProduto(produto);

  revalidatePath("/admin/produtos");
  revalidarSitePublico(produto.slug);
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

  const produto = await prisma.produto.update({
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
  revalidarSitePublico(produto.slug);

  return { status: "success", message: "Alterações salvas." };
}

/**
 * Fase 2 (spec §5.1): cola ID + link de afiliado → GET /items/{id} preenche o
 * resto, e um Post PRODUTO publicado é criado automaticamente no blog.
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

  const publicado = await garantirPostPublicadoDoProduto(produto);

  revalidatePath("/admin/produtos");
  revalidarSitePublico(produto.slug);
  redirect(`/admin/posts/${publicado.id}`);
}

/** Agenda a distribuição do produto em todos os canais ativos (spec §5.2). */
export async function distribuirProdutoAction(produtoId: string): Promise<ResultadoEnfileiramento[]> {
  try {
    const resultados = await enfileirarProduto(produtoId);
    revalidatePath("/admin/fila");
    revalidatePath(`/admin/produtos/${produtoId}`);
    return resultados;
  } catch (erro) {
    return [
      {
        canalId: "erro",
        canal: "Distribuição",
        motivoPulado: erro instanceof Error ? erro.message : "Falha ao distribuir o produto.",
      },
    ];
  }
}
