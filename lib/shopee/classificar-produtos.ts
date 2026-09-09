import { prisma, Plataforma, SegmentoProduto, type Prisma, type Produto } from "@/lib/database";
import { registrar } from "@/lib/log";
import { obterConfiguracao } from "@/lib/configuracao";
import { buscarOfertaPorItem } from "./client";
import { descontoPercentualOferta } from "./qualidade-oferta";

/** Pequena pausa entre produtos — mesma lógica de sincronizar-precos.ts. */
const PAUSA_ENTRE_PRODUTOS_MS = 300;

/** Amostra mínima pra confiar no percentil de vendas da categoria. */
const AMOSTRA_MINIMA_PERCENTIL = 5;

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
 * Passo 1: atualiza vendas/comissão/desconto de cada Produto Shopee ativo a
 * partir da API, e grava um ProdutoVendaSnapshot sempre (série completa,
 * diferente de HistoricoPreco que só grava quando o preço muda).
 */
async function atualizarDadosDeVendas(): Promise<void> {
  const produtos = await prisma.produto.findMany({
    where: { plataforma: Plataforma.SHOPEE, ativo: true },
  });

  let atualizados = 0;
  let semIds = 0;
  let comErro = 0;

  for (const produto of produtos) {
    try {
      const ids = extrairIds(produto.dadosBrutos);
      if (!ids) {
        semIds++;
        continue;
      }

      const ofertaFresca = await buscarOfertaPorItem(ids.shopId, ids.itemId);
      if (!ofertaFresca) continue;

      const descontoPct = descontoPercentualOferta({
        precoAtual: ofertaFresca.precoAtual,
        precoOriginal: ofertaFresca.precoOriginal,
      });

      await prisma.$transaction([
        prisma.produto.update({
          where: { id: produto.id },
          data: {
            vendas: ofertaFresca.vendas ?? undefined,
            taxaComissao: ofertaFresca.comissaoPercentual ?? undefined,
            comissaoEstimada: ofertaFresca.comissaoValor ?? undefined,
            descontoPct,
          },
        }),
        ...(ofertaFresca.vendas != null
          ? [prisma.produtoVendaSnapshot.create({ data: { produtoId: produto.id, vendas: ofertaFresca.vendas } })]
          : []),
      ]);

      atualizados++;
    } catch (erro) {
      comErro++;
      await registrar("ERRO", "PRODUTO_SEGMENTACAO", "Falha ao atualizar dados de vendas da Shopee", {
        produtoId: produto.id,
        idExterno: produto.idExterno,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_PRODUTOS_MS));
  }

  await registrar("INFO", "PRODUTO_SEGMENTACAO", "Shopee: dados de vendas atualizados", {
    total: produtos.length,
    atualizados,
    semIds,
    comErro,
  });
}

function percentil(valores: number[], p: number): number {
  const ordenado = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenado.length - 1, Math.max(0, Math.ceil((p / 100) * ordenado.length) - 1));
  return ordenado[indice];
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

function normalizar(valor: number, min: number, max: number): number {
  if (max <= min) return 0;
  return (valor - min) / (max - min);
}

interface MotivoSegmento {
  criterio: "percentil" | "fallback_comissao_desconto";
  amostraCategoria: number;
  p80DaCategoria?: number;
  mediaComissaoCategoria: number;
  mediaDescontoCategoria: number;
  pesosAplicados: { vendas: number; desconto: number; comissao: number };
}

/**
 * Passo 2: classifica cada Produto Shopee ativo em segmento + score, dentro
 * da própria categoria. Produto que não bate em nenhum critério vira
 * DESCARTADO explicitamente (não fica null).
 */
async function classificarPorCategoria(): Promise<Record<SegmentoProduto, number>> {
  const config = await obterConfiguracao();
  const percentilAlvo = config.motorPercentilVendeBem;
  const descontoMinimo = config.motorDescontoMinimoPct;
  const pesos = {
    vendas: Number(config.motorPesoVendas),
    desconto: Number(config.motorPesoDesconto),
    comissao: Number(config.motorPesoComissao),
  };

  const produtos = await prisma.produto.findMany({
    where: { plataforma: Plataforma.SHOPEE, ativo: true },
  });

  const porCategoria = new Map<string, Produto[]>();
  for (const produto of produtos) {
    const lista = porCategoria.get(produto.categoria) ?? [];
    lista.push(produto);
    porCategoria.set(produto.categoria, lista);
  }

  const contagem: Record<SegmentoProduto, number> = {
    VENDE_BEM: 0,
    VENDE_BEM_DESCONTO: 0,
    POTENCIAL: 0,
    DESCARTADO: 0,
  };

  for (const [, itensDaCategoria] of porCategoria) {
    const vendasDaCategoria = itensDaCategoria.map((p) => p.vendas ?? 0);
    const comissoesDaCategoria = itensDaCategoria.map((p) => (p.taxaComissao ? Number(p.taxaComissao) : 0));
    const descontosDaCategoria = itensDaCategoria.map((p) => p.descontoPct ?? 0);

    const amostraSuficiente = itensDaCategoria.length >= AMOSTRA_MINIMA_PERCENTIL;
    const p80 = amostraSuficiente ? percentil(vendasDaCategoria, percentilAlvo) : null;
    const mediaComissao = media(comissoesDaCategoria);
    const mediaDesconto = media(descontosDaCategoria);
    const minVendas = Math.min(...vendasDaCategoria);
    const maxVendas = Math.max(...vendasDaCategoria);

    for (const produto of itensDaCategoria) {
      const vendas = produto.vendas ?? 0;
      const comissao = produto.taxaComissao ? Number(produto.taxaComissao) : 0;
      const desconto = produto.descontoPct ?? 0;

      const vendeBem = p80 !== null && vendas >= p80;
      const potencial = comissao > mediaComissao || desconto > mediaDesconto;

      let segmento: SegmentoProduto;
      if (vendeBem && desconto >= descontoMinimo) segmento = SegmentoProduto.VENDE_BEM_DESCONTO;
      else if (vendeBem) segmento = SegmentoProduto.VENDE_BEM;
      else if (potencial) segmento = SegmentoProduto.POTENCIAL;
      else segmento = SegmentoProduto.DESCARTADO;

      const pontuacao =
        pesos.vendas * normalizar(vendas, minVendas, maxVendas) + pesos.desconto * desconto + pesos.comissao * comissao;

      const motivo: MotivoSegmento = {
        criterio: p80 !== null ? "percentil" : "fallback_comissao_desconto",
        amostraCategoria: itensDaCategoria.length,
        ...(p80 !== null ? { p80DaCategoria: p80 } : {}),
        mediaComissaoCategoria: Math.round(mediaComissao * 100) / 100,
        mediaDescontoCategoria: Math.round(mediaDesconto * 100) / 100,
        pesosAplicados: pesos,
      };

      await prisma.produto.update({
        where: { id: produto.id },
        data: {
          segmento,
          pontuacao,
          segmentadoEm: new Date(),
          motivoSegmento: motivo as unknown as Prisma.InputJsonValue,
        },
      });

      contagem[segmento]++;
    }
  }

  return contagem;
}

/**
 * Sync + classificação do motor de produtos (Fase 1: só Shopee). Chamada
 * periodicamente pelo worker (2-4x/dia) — ver workers/index.ts.
 */
export async function classificarProdutosShopee(): Promise<void> {
  if (!process.env.SHOPEE_APP_ID || !process.env.SHOPEE_SECRET) {
    await registrar("INFO", "PRODUTO_SEGMENTACAO", "Shopee não configurada, classificação pulada");
    return;
  }

  await atualizarDadosDeVendas();
  const contagem = await classificarPorCategoria();

  await registrar("INFO", "PRODUTO_SEGMENTACAO", "Shopee: classificação concluída", contagem);
}
