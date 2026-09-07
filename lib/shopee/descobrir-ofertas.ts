import { prisma, Destino, Categoria, TipoPost, StatusPost } from "@/lib/database";
import { registrar } from "@/lib/log";
import { slugify } from "@/lib/produtos";
import { resumoAutomatico } from "@/lib/conteudo/corpo";
import { enfileirarPost } from "@/lib/agenda/enfileirar";
import { obterConfiguracao } from "@/lib/configuracao";
import { buscarOfertasShopee, type OfertaShopee } from "./client";
import { PALAVRAS_CHAVE_CASA } from "./palavras-chave-casa";
import { classificarOferta, pontuarOferta } from "./qualidade-oferta";
import { importarOfertaShopee } from "./importar-oferta";
import { escolherOfertasDiversas, indiceCatalogoShopeeCasa } from "./diversidade-ofertas";

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
 * Busca ofertas Shopee por palavra-chave de casa (uma busca por termo em
 * PALAVRAS_CHAVE_CASA — a Shopee não tem filtro de categoria funcional nessa
 * API, então "casa" é garantido pelo termo buscado, não por listType/catId),
 * importa só o que ainda não está no catálogo (promoção ou bom preço,
 * comissão mínima, até o limite diário; no máximo dois por keyword) e
 * agrupa num Post tipo LISTA. Já salvos e títulos parecidos não entram
 * de novo. Chamada periodicamente pelo worker — ver workers/index.ts.
 *
 * sortType 1 = relevância da keyword. O antigo 5 (maior comissão) puxava
 * produto fora de casa mesmo com termo de quarto/cozinha.
 */
export async function descobrirOfertasShopee(): Promise<void> {
  if (!process.env.SHOPEE_APP_ID || !process.env.SHOPEE_SECRET) {
    await registrar("INFO", "PRODUTO_DESCOBERTA", "Shopee não configurada, descoberta automática pulada");
    return;
  }

  const configuracao = await obterConfiguracao();
  const limiteDiario = configuracao.shopeeDescobertaLimiteDiario;
  const comissaoMinima = configuracao.shopeeComissaoMinimaPct;

  const encontradas = new Map<string, { oferta: OfertaShopee; categoria: Categoria; keyword: string }>();
  let falhasBusca = 0;
  const paginaExtra = (Math.floor(Date.now() / 86_400_000) % 2) + 2;

  for (const { keyword, categoria } of PALAVRAS_CHAVE_CASA) {
    try {
      const [pagina1, paginaN] = await Promise.all([
        buscarOfertasShopee({ keyword, sortType: 1, limit: 15, page: 1 }),
        buscarOfertasShopee({ keyword, sortType: 1, limit: 15, page: paginaExtra }),
      ]);
      for (const oferta of [...pagina1, ...paginaN]) {
        const chave = `${oferta.shopId}_${oferta.itemId}`;
        if (!encontradas.has(chave)) encontradas.set(chave, { oferta, categoria, keyword });
      }
    } catch (erro) {
      falhasBusca++;
      await registrar("ERRO", "PRODUTO_DESCOBERTA", "Falha ao buscar ofertas da Shopee por palavra-chave", {
        keyword,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  const ofertas = [...encontradas.values()];
  const foraDoTema = ofertas.filter(({ oferta }) => classificarOferta(oferta) === null).length;
  const elegiveis = ofertas.filter(
    ({ oferta }) => (oferta.comissaoPercentual ?? 0) >= comissaoMinima && classificarOferta(oferta) !== null,
  );

  const indice = await indiceCatalogoShopeeCasa();
  const candidatas = escolherOfertasDiversas(elegiveis, {
    nome: (c) => c.oferta.nome,
    idExterno: (c) => `${c.oferta.shopId}_${c.oferta.itemId}`,
    tipo: (c) => c.keyword,
    score: (c) => pontuarOferta(c.oferta),
    indice,
    maxTotal: limiteDiario,
  });

  const importados: Array<{ id: string; slug: string }> = [];
  let pulados = elegiveis.length - candidatas.length;
  let atualizados = 0;
  let comErro = 0;

  for (const { oferta, categoria } of candidatas) {
    if (importados.length >= limiteDiario) break;

    try {
      const resultado = await importarOfertaShopee({
        oferta,
        categoria,
        origem: "descoberta_automatica",
      });
      if (resultado.status === "importado") importados.push({ id: resultado.id, slug: resultado.slug });
      else if (resultado.status === "atualizado") {
        atualizados++;
        pulados++;
      } else pulados++;
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
    foraDoTema,
    elegiveis: elegiveis.length,
    importados: importados.length,
    atualizados,
    pulados,
    comErro,
    falhasBusca,
    listaId,
    listaSlug,
  });
}
