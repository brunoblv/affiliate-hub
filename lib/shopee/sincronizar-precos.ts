import { prisma, Plataforma, type Prisma } from "@/lib/database";
import { registrar } from "@/lib/log";
import { buscarOfertaPorItem } from "./client";

/** Pequena pausa entre produtos — mesma lógica do sync do Mercado Livre. */
const PAUSA_ENTRE_PRODUTOS_MS = 300;

interface DadosBrutosComIds {
  shop_id?: number | null;
  item_id?: number | null;
}

function extrairIds(dadosBrutos: Prisma.JsonValue | null): { shopId: number; itemId: number } | null {
  if (!dadosBrutos || typeof dadosBrutos !== "object" || Array.isArray(dadosBrutos)) return null;
  const { shop_id, item_id } = dadosBrutos as DadosBrutosComIds;
  if (typeof shop_id !== "number" || typeof item_id !== "number") return null;
  return { shopId: shop_id, itemId: item_id };
}

/**
 * Atualiza preço, nome e imagem dos produtos ativos da Shopee, gravando um
 * snapshot em HistoricoPreco sempre que o preço mudar. Chamada periodicamente
 * pelo worker — ver workers/index.ts.
 */
export async function sincronizarPrecosShopee(): Promise<void> {
  if (!process.env.SHOPEE_APP_ID || !process.env.SHOPEE_SECRET) {
    await registrar("INFO", "PRODUTO_SYNC", "Shopee não configurada, sincronização de preço pulada");
    return;
  }

  const produtos = await prisma.produto.findMany({
    where: { plataforma: Plataforma.SHOPEE, ativo: true },
  });

  let atualizados = 0;
  let semMudanca = 0;
  let semIds = 0;
  let comErro = 0;

  for (const produto of produtos) {
    try {
      const ids = extrairIds(produto.dadosBrutos);
      if (!ids) {
        semIds++;
        await registrar("INFO", "PRODUTO_SYNC", "Produto sem shop_id/item_id, sync pulado", {
          produtoId: produto.id,
          idExterno: produto.idExterno,
        });
        continue;
      }

      const ofertaFresca = await buscarOfertaPorItem(ids.shopId, ids.itemId);

      if (!ofertaFresca) {
        await registrar("INFO", "PRODUTO_SYNC", "Oferta não encontrada na Shopee (removida/expirada?)", {
          produtoId: produto.id,
          idExterno: produto.idExterno,
        });
        continue;
      }

      const precoAtual = Number(produto.precoAtual);
      const precoOriginalAtual = produto.precoOriginal === null ? null : Number(produto.precoOriginal);
      const imagens = Array.isArray(produto.imagens) ? (produto.imagens as string[]) : [];

      const precoMudou =
        ofertaFresca.precoAtual !== precoAtual || ofertaFresca.precoOriginal !== precoOriginalAtual;
      const nomeMudou = ofertaFresca.nome !== produto.nome;
      const imagemMudou = Boolean(ofertaFresca.imagemUrl) && ofertaFresca.imagemUrl !== imagens[0];

      if (!precoMudou && !nomeMudou && !imagemMudou) {
        semMudanca++;
        await prisma.produto.update({ where: { id: produto.id }, data: { sincronizadoEm: new Date() } });
        continue;
      }

      const dados: Prisma.ProdutoUpdateInput = { sincronizadoEm: new Date() };
      if (precoMudou) {
        dados.precoAtual = ofertaFresca.precoAtual;
        dados.precoOriginal = ofertaFresca.precoOriginal;
      }
      if (nomeMudou) dados.nome = ofertaFresca.nome;
      if (imagemMudou && ofertaFresca.imagemUrl) dados.imagens = [ofertaFresca.imagemUrl, ...imagens.slice(1)];

      await prisma.$transaction([
        prisma.produto.update({ where: { id: produto.id }, data: dados }),
        ...(precoMudou
          ? [prisma.historicoPreco.create({ data: { produtoId: produto.id, preco: ofertaFresca.precoAtual } })]
          : []),
      ]);

      atualizados++;
    } catch (erro) {
      comErro++;
      await registrar("ERRO", "PRODUTO_SYNC", "Falha ao sincronizar preço da Shopee", {
        produtoId: produto.id,
        idExterno: produto.idExterno,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_PRODUTOS_MS));
  }

  await registrar("INFO", "PRODUTO_SYNC", "Shopee: sincronização de preço concluída", {
    total: produtos.length,
    atualizados,
    semMudanca,
    semIds,
    comErro,
  });
}
