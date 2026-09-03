import { prisma, Plataforma, type Produto } from "@/lib/database";
import { gerarLinkAfiliado } from "./client";

function ehViolacaoUnica(erro: unknown): boolean {
  return Boolean(erro && typeof erro === "object" && "code" in erro && erro.code === "P2002");
}

function chaveDosSubIds(subIds: string[]): string {
  return subIds.join("|");
}

/** URL de produto da Shopee — `generateShortLink` não aceita bem o short link já rastreado. */
function urlOrigemShopee(produto: Pick<Produto, "idExterno" | "dadosBrutos" | "linkAfiliado">): string {
  const partes = produto.idExterno.split("_");
  if (partes.length === 2 && /^\d+$/.test(partes[0]!) && /^\d+$/.test(partes[1]!)) {
    return `https://shopee.com.br/product/${partes[0]}/${partes[1]}`;
  }

  const bruto =
    produto.dadosBrutos && typeof produto.dadosBrutos === "object"
      ? (produto.dadosBrutos as { shop_id?: unknown; item_id?: unknown })
      : null;
  const shopId = Number(bruto?.shop_id);
  const itemId = Number(bruto?.item_id);
  if (Number.isFinite(shopId) && shopId > 0 && Number.isFinite(itemId) && itemId > 0) {
    return `https://shopee.com.br/product/${shopId}/${itemId}`;
  }

  return produto.linkAfiliado.trim();
}

/**
 * Link de afiliado da Shopee com subIds (tipo de post + canal).
 * Outras plataformas e falha da API caem no `linkAfiliado` já cadastrado —
 * nunca na URL crua da loja.
 */
export async function resolverLinkAfiliadoEtiquetado(
  produto: Pick<Produto, "id" | "plataforma" | "idExterno" | "dadosBrutos" | "linkAfiliado">,
  subIds: string[],
): Promise<string> {
  const base = produto.linkAfiliado.trim();
  if (!base) return base;
  if (produto.plataforma !== Plataforma.SHOPEE || subIds.length === 0) return base;

  const chave = chaveDosSubIds(subIds);
  const emCache = await prisma.linkAfiliadoEtiquetado.findUnique({
    where: { produtoId_chave: { produtoId: produto.id, chave } },
    select: { url: true },
  });
  if (emCache?.url) return emCache.url;

  const origem = urlOrigemShopee(produto);
  if (!origem) return base;

  let url: string;
  try {
    url = await gerarLinkAfiliado(origem, subIds);
  } catch {
    return base;
  }
  if (!url.trim()) return base;

  try {
    await prisma.linkAfiliadoEtiquetado.create({
      data: { produtoId: produto.id, chave, url },
    });
  } catch (erro) {
    if (ehViolacaoUnica(erro)) {
      const deNovo = await prisma.linkAfiliadoEtiquetado.findUnique({
        where: { produtoId_chave: { produtoId: produto.id, chave } },
        select: { url: true },
      });
      if (deNovo?.url) return deNovo.url;
    }
  }

  return url;
}
