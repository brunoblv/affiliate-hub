"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Destino, Plataforma } from "@/lib/database";
import { gerarCodigoCurto, slugify } from "@/lib/produtos";
import { buscarItemMercadoLivre, buscarInfoCatalogo, buscarPrecoViaCatalogo } from "@/lib/mercado-livre/client";
import { parseIdentificadorMercadoLivre } from "@/lib/mercado-livre/parse-identificador";
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
 * Fase 2 (spec §5.1): cola ID/link + link de afiliado e o resto é preenchido
 * automaticamente; um Post PRODUTO publicado é criado no blog.
 * O link de afiliado nunca vem da API — é sempre colado por quem cadastra.
 *
 * `/items/{id}` só dá acesso pleno a anúncios da própria conta OAuth — como
 * produtos de afiliado são de terceiros, isso retorna 403. Por isso, quando o
 * texto colado é (ou contém) um link de produto de catálogo (`/p/MLB...`),
 * usamos a API de Catálogo (mesma que a sincronização de preço usa) em vez de
 * `/items/{id}` direto.
 */
export async function importarMercadoLivreAction(_prev: ProdutoFormState, formData: FormData): Promise<ProdutoFormState> {
  const identificadorBruto = String(formData.get("idExterno") ?? "").trim();
  const linkAfiliado = String(formData.get("linkAfiliado") ?? "").trim();

  if (!identificadorBruto || !linkAfiliado) {
    return { status: "error", message: "ID/link do anúncio e link de afiliado são obrigatórios." };
  }

  const { catalogProductId, itemId } = parseIdentificadorMercadoLivre(identificadorBruto);

  let idExterno: string;
  let nome: string;
  let imagens: string[];
  let precoAtual: number;
  let precoOriginal: number | null;
  let dadosBrutos: object;

  try {
    if (catalogProductId) {
      const [precoFresco, info] = await Promise.all([
        buscarPrecoViaCatalogo(catalogProductId, itemId ?? undefined),
        buscarInfoCatalogo(catalogProductId),
      ]);

      if (!precoFresco) {
        return { status: "error", message: "Anúncio não encontrado no catálogo do Mercado Livre (removido/pausado?)." };
      }

      idExterno = precoFresco.itemId;
      nome = info.nome;
      imagens = info.imagens.slice(0, 6);
      precoAtual = precoFresco.preco;
      precoOriginal = precoFresco.precoOriginal;
      dadosBrutos = { catalog_product_id: catalogProductId, item_id: idExterno };
    } else if (itemId) {
      const item = await buscarItemMercadoLivre(itemId);
      idExterno = itemId;
      nome = item.title;
      imagens = item.pictures.map((p) => p.url).slice(0, 6);
      precoAtual = item.price;
      precoOriginal = item.original_price;
      dadosBrutos = JSON.parse(JSON.stringify(item));
    } else {
      return {
        status: "error",
        message: "Não deu pra identificar o ID do anúncio nesse texto/link. Cole o ID (MLBxxxxxxxxxx) ou a URL do anúncio/produto.",
      };
    }
  } catch (erro) {
    return { status: "error", message: erro instanceof Error ? erro.message : "Falha ao consultar o Mercado Livre." };
  }

  const slug = slugify(nome);

  const produto = await prisma.produto.create({
    data: {
      plataforma: Plataforma.MERCADO_LIVRE,
      idExterno,
      slug,
      nome,
      imagens,
      precoAtual,
      precoOriginal,
      linkAfiliado,
      codigoCurto: gerarCodigoCurto(),
      dadosBrutos,
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
