import { prisma, Plataforma, Destino, Categoria, TipoPost, StatusPost } from "@/lib/database";
import { registrar } from "@/lib/log";
import { slugify, gerarCodigoCurto } from "@/lib/produtos";
import { resumoAutomatico } from "@/lib/conteudo/corpo";
import { enfileirarPost } from "@/lib/agenda/enfileirar";
import { buscarOfertasShopee, gerarLinkAfiliado, type OfertaShopee } from "./client";

const LIMITE_DIARIO_PADRAO = 15;
const COMISSAO_MINIMA_PADRAO_PCT = 10;

function ehViolacaoDeIdExternoDuplicado(erro: unknown): boolean {
  if (!erro || typeof erro !== "object" || !("code" in erro)) return false;
  const target = "meta" in erro && erro.meta && typeof erro.meta === "object" && "target" in erro.meta
    ? String(erro.meta.target)
    : "";
  return erro.code === "P2002" && target.includes("idExterno");
}

async function slugLivre(base: string): Promise<string> {
  const limpo = slugify(base) || "lista";
  const jaTem = await prisma.post.findUnique({ where: { slug: limpo }, select: { id: true } });
  if (!jaTem) return limpo;

  for (let n = 2; n < 50; n++) {
    const candidato = `${limpo}-${n}`;
    const ocupado = await prisma.post.findUnique({ where: { slug: candidato }, select: { id: true } });
    if (!ocupado) return candidato;
  }

  return `${limpo}-${Date.now().toString(36)}`;
}

async function importarOferta(oferta: OfertaShopee): Promise<{ id: string; slug: string } | null> {
  const idExterno = `${oferta.shopId}_${oferta.itemId}`;

  const existente = await prisma.produto.findUnique({
    where: { plataforma_idExterno: { plataforma: Plataforma.SHOPEE, idExterno } },
    select: { id: true },
  });
  if (existente) return null;

  let linkAfiliado = oferta.offerLink;
  if (!linkAfiliado) {
    linkAfiliado = await gerarLinkAfiliado(`https://shopee.com.br/product/${oferta.shopId}/${oferta.itemId}`);
  }
  if (!linkAfiliado) return null;

  const slug = await slugLivreProduto(oferta.nome);

  try {
    const produto = await prisma.produto.create({
      data: {
        plataforma: Plataforma.SHOPEE,
        destino: Destino.MEU_NOVO_LAR,
        categoria: Categoria.OUTRA,
        idExterno,
        slug,
        nome: oferta.nome,
        imagens: oferta.imagemUrl ? [oferta.imagemUrl] : [],
        precoAtual: oferta.precoAtual,
        precoOriginal: oferta.precoOriginal,
        linkAfiliado,
        codigoCurto: gerarCodigoCurto(),
        dadosBrutos: { shop_id: oferta.shopId, item_id: oferta.itemId, origem: "descoberta_automatica" },
        sincronizadoEm: new Date(),
      },
      select: { id: true, slug: true },
    });
    return produto;
  } catch (erro) {
    if (ehViolacaoDeIdExternoDuplicado(erro)) return null;
    throw erro;
  }
}

async function slugLivreProduto(base: string): Promise<string> {
  const limpo = slugify(base) || "produto";
  const jaTem = await prisma.produto.findUnique({ where: { slug: limpo }, select: { id: true } });
  if (!jaTem) return limpo;

  for (let n = 2; n < 50; n++) {
    const candidato = `${limpo}-${n}`;
    const ocupado = await prisma.produto.findUnique({ where: { slug: candidato }, select: { id: true } });
    if (!ocupado) return candidato;
  }

  return `${limpo}-${Date.now().toString(36)}`;
}

async function criarListaDoDia(produtos: Array<{ id: string; slug: string }>): Promise<{ id: string; slug: string }> {
  const titulo = `Achados de hoje na Shopee — ${new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}`;

  const corpo = produtos.map((p) => `[produto:${p.slug}]`).join("\n\n");

  const post = await prisma.post.create({
    data: {
      tipo: TipoPost.LISTA,
      destino: Destino.MEU_NOVO_LAR,
      titulo,
      slug: await slugLivre(titulo),
      resumo: resumoAutomatico(corpo) || titulo,
      corpo,
      status: StatusPost.PUBLICADO,
      publicadoEm: new Date(),
      produtos: { create: produtos.map((p, ordem) => ({ produtoId: p.id, ordem })) },
    },
    select: { id: true, slug: true },
  });

  return post;
}

/**
 * Busca as top ofertas Shopee do dia (sem keyword — `listType`/`sortType`),
 * importa as elegíveis (comissão mínima, até o limite diário) e agrupa tudo
 * num único Post tipo LISTA, distribuído nos canais ativos. Chamada
 * periodicamente pelo worker — ver workers/index.ts.
 */
export async function descobrirOfertasShopee(): Promise<void> {
  if (!process.env.SHOPEE_APP_ID || !process.env.SHOPEE_SECRET) {
    await registrar("INFO", "PRODUTO_DESCOBERTA", "Shopee não configurada, descoberta automática pulada");
    return;
  }

  const limiteDiario = Number(process.env.SHOPEE_DESCOBERTA_LIMITE_DIARIO ?? LIMITE_DIARIO_PADRAO);
  const comissaoMinima = Number(process.env.SHOPEE_COMISSAO_MINIMA_PCT ?? COMISSAO_MINIMA_PADRAO_PCT);

  let ofertas: OfertaShopee[];
  try {
    ofertas = await buscarOfertasShopee({ listType: 1, sortType: 5, limit: 50 });
  } catch (erro) {
    await registrar("ERRO", "PRODUTO_DESCOBERTA", "Falha ao buscar ofertas da Shopee", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
    return;
  }

  const elegiveis = ofertas.filter((o) => (o.comissaoPercentual ?? 0) >= comissaoMinima);

  const importados: Array<{ id: string; slug: string }> = [];
  let pulados = 0;
  let comErro = 0;

  for (const oferta of elegiveis) {
    if (importados.length >= limiteDiario) break;

    try {
      const produto = await importarOferta(oferta);
      if (produto) importados.push(produto);
      else pulados++;
    } catch (erro) {
      comErro++;
      await registrar("ERRO", "PRODUTO_DESCOBERTA", "Falha ao importar oferta da Shopee", {
        shopId: oferta.shopId,
        itemId: oferta.itemId,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  let listaId: string | null = null;
  let listaSlug: string | null = null;

  if (importados.length > 0) {
    const lista = await criarListaDoDia(importados);
    listaId = lista.id;
    listaSlug = lista.slug;
    await enfileirarPost(lista.id);
  }

  await registrar("INFO", "PRODUTO_DESCOBERTA", "Shopee: descoberta automática concluída", {
    avaliados: ofertas.length,
    elegiveis: elegiveis.length,
    importados: importados.length,
    pulados,
    comErro,
    listaId,
    listaSlug,
  });
}
