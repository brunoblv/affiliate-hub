import { prisma, Plataforma, Destino, Categoria, TipoOfertaShopee } from "@/lib/database";
import { gerarCodigoCurto, HOME_CATEGORIAS } from "@/lib/produtos";
import { ehForaDoTemaCasa } from "@/lib/nicho";
import { encontrarProdutoCanonico } from "@/lib/catalogo";
import { slugDeProdutoLivre } from "@/lib/conteudo/slug";
import { gerarLinkAfiliado, type OfertaShopee, type TipoOfertaShopeeApi } from "./client";
import { descontoPercentualOferta } from "./qualidade-oferta";

const MAPA_TIPO_OFERTA: Record<TipoOfertaShopeeApi, TipoOfertaShopee> = {
  OFERTA_PRODUTO: TipoOfertaShopee.OFERTA_PRODUTO,
  OFERTA_LOJA: TipoOfertaShopee.OFERTA_LOJA,
  OFERTA_GERAL: TipoOfertaShopee.OFERTA_GERAL,
};

function ehViolacaoDeIdExternoDuplicado(erro: unknown): boolean {
  if (!erro || typeof erro !== "object" || !("code" in erro)) return false;
  const target =
    "meta" in erro && erro.meta && typeof erro.meta === "object" && "target" in erro.meta
      ? String(erro.meta.target)
      : "";
  return erro.code === "P2002" && target.includes("idExterno");
}

export type ResultadoImportacaoOferta = "importado" | "atualizado" | "ja_existia" | "sem_link" | "fora_do_nicho" | "erro";

/**
 * Cria ou atualiza o Produto a partir de uma oferta já buscada na API — sem reconsultar.
 * Sem link de afiliado real o produto não entra (regra AGENTS.md).
 * Mesmo título (slug canônico) faz upsert na página existente, não cria -2/-3.
 */
export async function importarOfertaShopee(params: {
  oferta: OfertaShopee;
  categoria: Categoria;
  destino?: Destino;
  origem: string;
  /**
   * true só no fluxo do motor de produtos (curadoria/roteamento pra grupos de
   * WhatsApp/Telegram/Facebook fora do nicho casa) — nunca na descoberta
   * diária de casa, que deve continuar recusando fora do nicho.
   */
  permitirForaDoNicho?: boolean;
}): Promise<
  | { status: "importado" | "atualizado"; id: string; slug: string }
  | { status: Exclude<ResultadoImportacaoOferta, "importado" | "atualizado"> }
> {
  const { oferta, origem, permitirForaDoNicho } = params;
  const destino = params.destino ?? Destino.MEU_NOVO_LAR;
  const idExterno = `${oferta.shopId}_${oferta.itemId}`;

  if (!permitirForaDoNicho && ehForaDoTemaCasa(oferta.nome)) return { status: "fora_do_nicho" };
  // Fora do nicho permitido: mantém a categoria real (não força CASA), pra
  // HOME_CATEGORIAS/produtoVisivelNoSite continuarem corretos no roteamento.
  const categoria =
    !permitirForaDoNicho && destino === Destino.MEU_NOVO_LAR && !HOME_CATEGORIAS.includes(params.categoria)
      ? Categoria.CASA
      : params.categoria;

  const descontoPct = descontoPercentualOferta({ precoAtual: oferta.precoAtual, precoOriginal: oferta.precoOriginal });
  const dadosMotor = {
    vendas: oferta.vendas ?? undefined,
    taxaComissao: oferta.comissaoPercentual ?? undefined,
    comissaoEstimada: oferta.comissaoValor ?? undefined,
    descontoPct,
    tipoOferta: MAPA_TIPO_OFERTA[oferta.tipoOferta],
  };

  const existente = await encontrarProdutoCanonico(Plataforma.SHOPEE, oferta.nome, idExterno);

  let linkAfiliado = oferta.offerLink;
  if (!linkAfiliado) {
    linkAfiliado = await gerarLinkAfiliado(`https://shopee.com.br/product/${oferta.shopId}/${oferta.itemId}`);
  }
  if (!linkAfiliado) return { status: "sem_link" };

  if (existente) {
    const produto = await prisma.produto.update({
      where: { id: existente.id },
      data: {
        nome: oferta.nome,
        imagens: oferta.imagemUrl ? [oferta.imagemUrl] : undefined,
        precoAtual: oferta.precoAtual,
        precoOriginal: oferta.precoOriginal,
        linkAfiliado,
        categoria,
        destino,
        dadosBrutos: { shop_id: oferta.shopId, item_id: oferta.itemId, origem },
        sincronizadoEm: new Date(),
        ...dadosMotor,
      },
      select: { id: true, slug: true },
    });
    return { status: "atualizado", id: produto.id, slug: produto.slug };
  }

  try {
    const produto = await prisma.produto.create({
      data: {
        plataforma: Plataforma.SHOPEE,
        destino,
        categoria,
        idExterno,
        slug: await slugDeProdutoLivre(oferta.nome),
        nome: oferta.nome,
        imagens: oferta.imagemUrl ? [oferta.imagemUrl] : [],
        precoAtual: oferta.precoAtual,
        precoOriginal: oferta.precoOriginal,
        linkAfiliado,
        codigoCurto: gerarCodigoCurto(),
        dadosBrutos: { shop_id: oferta.shopId, item_id: oferta.itemId, origem },
        sincronizadoEm: new Date(),
        ...dadosMotor,
      },
      select: { id: true, slug: true },
    });
    return { status: "importado", id: produto.id, slug: produto.slug };
  } catch (erro) {
    if (ehViolacaoDeIdExternoDuplicado(erro)) return { status: "ja_existia" };
    throw erro;
  }
}
