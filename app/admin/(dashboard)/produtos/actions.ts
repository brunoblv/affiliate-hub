"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Destino, Categoria, Plataforma } from "@/lib/database";
import { gerarCodigoCurto, slugify } from "@/lib/produtos";
import { buscarItemMercadoLivre, buscarInfoCatalogo, buscarPrecoViaCatalogo } from "@/lib/mercado-livre/client";
import { parseIdentificadorMercadoLivre } from "@/lib/mercado-livre/parse-identificador";
import { buscarOfertasShopee, buscarOfertaPorItem, gerarLinkAfiliado, type OfertaShopee } from "@/lib/shopee/client";
import { parseIdentificadorShopee } from "@/lib/shopee/parse-identificador";
import { enfileirarProduto, publicarProdutoAgora, type ResultadoEnfileiramento } from "@/lib/agenda/enfileirar";
import { garantirPostPublicadoDoProduto } from "@/lib/conteudo/post-do-produto";
import { descobrirOfertasShopee } from "@/lib/shopee/descobrir-ofertas";
import { atualizarConfiguracao } from "@/lib/configuracao";

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
  const categoria = String(formData.get("categoria") ?? "") as Categoria;
  const idExterno = String(formData.get("idExterno") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const notaEditorial = String(formData.get("notaEditorial") ?? "").trim();
  const precoAtual = String(formData.get("precoAtual") ?? "").trim();
  const precoOriginal = String(formData.get("precoOriginal") ?? "").trim();
  const imagens = parseImagens(String(formData.get("imagens") ?? ""));
  // Regra AGENTS.md: nunca divulgar a URL crua da loja — só o link de afiliado real.
  const linkAfiliado = String(formData.get("linkAfiliado") ?? "").trim();
  const ativo = formData.get("ativo") === "on";

  return {
    nome,
    plataforma,
    destino,
    categoria,
    idExterno,
    descricao,
    notaEditorial,
    precoAtual,
    precoOriginal,
    imagens,
    linkAfiliado,
    ativo,
  };
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
      categoria: dados.categoria,
      idExterno: dados.idExterno,
      slug: slugify(dados.nome),
      nome: dados.nome,
      descricao: dados.descricao || null,
      notaEditorial: dados.notaEditorial || null,
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
      categoria: dados.categoria,
      idExterno: dados.idExterno,
      nome: dados.nome,
      descricao: dados.descricao || null,
      notaEditorial: dados.notaEditorial || null,
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
interface DadosImportacaoMercadoLivre {
  idExterno: string;
  nome: string;
  imagens: string[];
  precoAtual: number;
  precoOriginal: number | null;
  dadosBrutos: object;
}

/** Busca preço + info de um produto de catálogo, combinando as duas chamadas em um resultado só. */
async function resolverViaCatalogo(catalogProductId: string, itemId?: string): Promise<DadosImportacaoMercadoLivre | null> {
  const [precoFresco, info] = await Promise.all([
    buscarPrecoViaCatalogo(catalogProductId, itemId),
    buscarInfoCatalogo(catalogProductId),
  ]);

  if (!precoFresco) return null;

  return {
    idExterno: precoFresco.itemId,
    nome: info.nome,
    imagens: info.imagens.slice(0, 6),
    precoAtual: precoFresco.preco,
    precoOriginal: precoFresco.precoOriginal,
    dadosBrutos: { catalog_product_id: catalogProductId, item_id: precoFresco.itemId },
  };
}

/** P2002 em `[plataforma, idExterno]` — produto já importado antes. */
function ehViolacaoDeIdExternoDuplicado(erro: unknown): boolean {
  if (!erro || typeof erro !== "object" || !("code" in erro)) return false;
  const target = "meta" in erro && erro.meta && typeof erro.meta === "object" && "target" in erro.meta
    ? String(erro.meta.target)
    : "";
  return erro.code === "P2002" && target.includes("idExterno");
}

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
      const resolvido = await resolverViaCatalogo(catalogProductId, itemId ?? undefined);
      if (!resolvido) {
        return { status: "error", message: "Anúncio não encontrado no catálogo do Mercado Livre (removido/pausado?)." };
      }
      ({ idExterno, nome, imagens, precoAtual, precoOriginal, dadosBrutos } = resolvido);
    } else if (itemId) {
      try {
        const item = await buscarItemMercadoLivre(itemId);
        idExterno = itemId;
        nome = item.title;
        imagens = item.pictures.map((p) => p.url).slice(0, 6);
        precoAtual = item.price;
        precoOriginal = item.original_price;
        dadosBrutos = JSON.parse(JSON.stringify(item));
      } catch (erroItem) {
        // ID colado "cru" (sem link `/p/...`) pode ser na verdade um produto de
        // catálogo, não um anúncio — tenta via API de Catálogo antes de desistir.
        const resolvido = await resolverViaCatalogo(itemId);
        if (!resolvido) throw erroItem;
        ({ idExterno, nome, imagens, precoAtual, precoOriginal, dadosBrutos } = resolvido);
      }
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

  let produto;
  try {
    produto = await prisma.produto.create({
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
  } catch (erro) {
    if (ehViolacaoDeIdExternoDuplicado(erro)) {
      return { status: "error", message: `Esse anúncio (${idExterno}) já foi importado antes.` };
    }
    throw erro;
  }

  const publicado = await garantirPostPublicadoDoProduto(produto);

  revalidatePath("/admin/produtos");
  revalidarSitePublico(produto.slug);
  redirect(`/admin/posts/${publicado.id}`);
}

export interface BuscaShopeeState {
  status: "idle" | "error" | "success";
  message?: string;
  ofertas?: OfertaShopee[];
}

/** Busca ofertas ativas na Shopee por palavra-chave — usada na tela de pesquisa do admin. */
export async function buscarOfertasShopeeAction(_prev: BuscaShopeeState, formData: FormData): Promise<BuscaShopeeState> {
  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) {
    return { status: "error", message: "Digite uma palavra-chave pra buscar." };
  }

  try {
    const ofertas = await buscarOfertasShopee({ keyword });
    if (ofertas.length === 0) {
      return { status: "success", message: "Nenhuma oferta encontrada pra essa busca.", ofertas: [] };
    }
    return { status: "success", ofertas };
  } catch (erro) {
    return { status: "error", message: erro instanceof Error ? erro.message : "Falha ao buscar ofertas na Shopee." };
  }
}

/**
 * Importa um produto da Shopee — por `shopId`/`itemId` (vindos do botão
 * "Importar" da busca) ou por um link colado direto. Diferente do Mercado
 * Livre, o link de afiliado nunca é colado: vem do `offerLink` da própria
 * oferta ou, se ausente, da mutation `generateShortLink` — sempre o link real
 * da Shopee, nunca a URL crua do produto.
 */
export async function importarShopeeAction(_prev: ProdutoFormState, formData: FormData): Promise<ProdutoFormState> {
  const identificadorBruto = String(formData.get("identificador") ?? "").trim();
  const shopIdRaw = String(formData.get("shopId") ?? "").trim();
  const itemIdRaw = String(formData.get("itemId") ?? "").trim();
  const destino = (String(formData.get("destino") ?? "").trim() || "MEU_NOVO_LAR") as Destino;
  const categoria = (String(formData.get("categoria") ?? "").trim() || "OUTRA") as Categoria;

  let shopId: number | null = shopIdRaw ? Number(shopIdRaw) : null;
  let itemId: number | null = itemIdRaw ? Number(itemIdRaw) : null;

  if ((!shopId || !itemId) && identificadorBruto) {
    const identificado = await parseIdentificadorShopee(identificadorBruto);
    shopId = identificado.shopId;
    itemId = identificado.itemId;
  }

  if (!shopId || !itemId) {
    return {
      status: "error",
      message: "Não deu pra identificar o produto nesse link. Cole a URL do produto na Shopee.",
    };
  }

  let oferta: OfertaShopee | null;
  try {
    oferta = await buscarOfertaPorItem(shopId, itemId);
  } catch (erro) {
    return { status: "error", message: erro instanceof Error ? erro.message : "Falha ao consultar a Shopee." };
  }

  if (!oferta) {
    return { status: "error", message: "Esse produto não está disponível como oferta de afiliado na Shopee agora." };
  }

  let linkAfiliado = oferta.offerLink;
  if (!linkAfiliado) {
    try {
      linkAfiliado = await gerarLinkAfiliado(`https://shopee.com.br/product/${shopId}/${itemId}`);
    } catch (erro) {
      return {
        status: "error",
        message: erro instanceof Error ? erro.message : "Falha ao gerar o link de afiliado na Shopee.",
      };
    }
  }

  if (!linkAfiliado) {
    return { status: "error", message: "A Shopee não retornou link de afiliado pra esse produto." };
  }

  const slug = slugify(oferta.nome);
  const idExterno = `${shopId}_${itemId}`;

  let produto;
  try {
    produto = await prisma.produto.create({
      data: {
        plataforma: Plataforma.SHOPEE,
        destino,
        categoria,
        idExterno,
        slug,
        nome: oferta.nome,
        imagens: oferta.imagemUrl ? [oferta.imagemUrl] : [],
        precoAtual: oferta.precoAtual,
        precoOriginal: oferta.precoOriginal,
        linkAfiliado,
        codigoCurto: gerarCodigoCurto(),
        dadosBrutos: { shop_id: shopId, item_id: itemId },
        sincronizadoEm: new Date(),
      },
    });
  } catch (erro) {
    if (ehViolacaoDeIdExternoDuplicado(erro)) {
      return { status: "error", message: `Esse produto (${idExterno}) já foi importado antes.` };
    }
    throw erro;
  }

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

/** Publica o produto agora em um canal específico, ignorando horário/teto do canal. */
export async function publicarAgoraProdutoAction(
  produtoId: string,
  canalId: string,
): Promise<ResultadoEnfileiramento> {
  try {
    const resultado = await publicarProdutoAgora(produtoId, canalId);
    revalidatePath("/admin/fila");
    revalidatePath(`/admin/produtos/${produtoId}`);
    return resultado;
  } catch (erro) {
    return {
      canalId,
      canal: "Publicar agora",
      motivoPulado: erro instanceof Error ? erro.message : "Falha ao publicar o produto.",
    };
  }
}

export interface ResultadoDistribuicaoEmLote {
  produtoId: string;
  produto: string;
  resultados: ResultadoEnfileiramento[];
}

/**
 * Distribui de uma vez todo produto ativo que nunca teve nenhuma Publicacao
 * (em nenhum canal) — cobre o caso de produto importado e esquecido antes de
 * entrar na fila. Reaproveita `enfileirarProduto`, então as mesmas regras de
 * canal/cooldown/horário de sempre continuam valendo por produto.
 */
export async function distribuirProdutosNuncaPostadosAction(): Promise<ResultadoDistribuicaoEmLote[]> {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, publicacoes: { none: {} } },
    select: { id: true, nome: true },
    orderBy: { criadoEm: "asc" },
  });

  const saida: ResultadoDistribuicaoEmLote[] = [];

  for (const produto of produtos) {
    try {
      const resultados = await enfileirarProduto(produto.id);
      saida.push({ produtoId: produto.id, produto: produto.nome, resultados });
    } catch (erro) {
      saida.push({
        produtoId: produto.id,
        produto: produto.nome,
        resultados: [
          {
            canalId: "erro",
            canal: "Distribuição",
            motivoPulado: erro instanceof Error ? erro.message : "Falha ao distribuir o produto.",
          },
        ],
      });
    }
  }

  revalidatePath("/admin/fila");
  revalidatePath("/admin/produtos");
  return saida;
}

/** Salva limite diário e comissão mínima da descoberta automática da Shopee. */
export async function atualizarConfiguracaoShopeeAction(
  _prev: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  const limiteDiario = Number(formData.get("shopeeDescobertaLimiteDiario"));
  const comissaoMinima = Number(formData.get("shopeeComissaoMinimaPct"));

  if (!Number.isInteger(limiteDiario) || limiteDiario < 1) {
    return { status: "error", message: "Limite diário precisa ser um número inteiro maior que zero." };
  }
  if (!Number.isInteger(comissaoMinima) || comissaoMinima < 0 || comissaoMinima > 100) {
    return { status: "error", message: "Comissão mínima precisa ser um número inteiro entre 0 e 100." };
  }

  await atualizarConfiguracao({
    shopeeDescobertaLimiteDiario: limiteDiario,
    shopeeComissaoMinimaPct: comissaoMinima,
  });

  revalidatePath("/admin/produtos/shopee");
  return { status: "success", message: "Configuração salva." };
}

/** Roda a descoberta automática de ofertas Shopee agora, fora do horário do worker. */
export async function rodarDescobertaShopeeAction(): Promise<{ status: "success" | "error"; message?: string }> {
  try {
    await descobrirOfertasShopee();
    revalidatePath("/admin/produtos/shopee");
    revalidatePath("/admin/fila");
    return { status: "success", message: "Descoberta concluída." };
  } catch (erro) {
    return {
      status: "error",
      message: erro instanceof Error ? erro.message : "Falha ao rodar a descoberta automática.",
    };
  }
}
