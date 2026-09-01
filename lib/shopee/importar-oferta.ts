import { prisma, Plataforma, Destino, Categoria } from "@/lib/database";
import { gerarCodigoCurto } from "@/lib/produtos";
import { slugDeProdutoLivre } from "@/lib/conteudo/slug";
import { gerarLinkAfiliado, type OfertaShopee } from "./client";

function ehViolacaoDeIdExternoDuplicado(erro: unknown): boolean {
  if (!erro || typeof erro !== "object" || !("code" in erro)) return false;
  const target =
    "meta" in erro && erro.meta && typeof erro.meta === "object" && "target" in erro.meta
      ? String(erro.meta.target)
      : "";
  return erro.code === "P2002" && target.includes("idExterno");
}

export type ResultadoImportacaoOferta = "importado" | "ja_existia" | "sem_link" | "erro";

/**
 * Cria o Produto a partir de uma oferta já buscada na API — sem reconsultar.
 * Sem link de afiliado real o produto não entra (regra AGENTS.md).
 */
export async function importarOfertaShopee(params: {
  oferta: OfertaShopee;
  categoria: Categoria;
  destino?: Destino;
  origem: string;
}): Promise<{ status: "importado"; id: string; slug: string } | { status: Exclude<ResultadoImportacaoOferta, "importado"> }> {
  const { oferta, categoria, origem } = params;
  const destino = params.destino ?? Destino.MEU_NOVO_LAR;
  const idExterno = `${oferta.shopId}_${oferta.itemId}`;

  const existente = await prisma.produto.findUnique({
    where: { plataforma_idExterno: { plataforma: Plataforma.SHOPEE, idExterno } },
    select: { id: true },
  });
  if (existente) return { status: "ja_existia" };

  let linkAfiliado = oferta.offerLink;
  if (!linkAfiliado) {
    linkAfiliado = await gerarLinkAfiliado(`https://shopee.com.br/product/${oferta.shopId}/${oferta.itemId}`);
  }
  if (!linkAfiliado) return { status: "sem_link" };

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
      },
      select: { id: true, slug: true },
    });
    return { status: "importado", id: produto.id, slug: produto.slug };
  } catch (erro) {
    if (ehViolacaoDeIdExternoDuplicado(erro)) return { status: "ja_existia" };
    throw erro;
  }
}
