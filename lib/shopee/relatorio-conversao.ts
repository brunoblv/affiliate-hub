import { buscarRelatorioConversao, type RelatorioConversaoNode } from "./client";

const LIMITE_POR_PAGINA = 500;
/** Teto de páginas por consulta — evita varredura sem fim se o período for muito largo. */
const MAX_PAGINAS = 20;

/**
 * Varre todo o período em páginas de 500 (o scrollId da Shopee só vale por
 * 30s entre chamadas — por isso encadeamos sem pausa, sequencialmente).
 */
export async function buscarConversoesDoPeriodo(params: {
  inicio: Date;
  fim: Date;
  orderStatus?: "ALL" | "UNPAID" | "PENDING" | "COMPLETED" | "CANCELLED";
}): Promise<RelatorioConversaoNode[]> {
  const nodes: RelatorioConversaoNode[] = [];
  let scrollId: string | undefined;
  let pagina = 0;

  do {
    const resultado = await buscarRelatorioConversao({
      purchaseTimeStart: Math.floor(params.inicio.getTime() / 1000),
      purchaseTimeEnd: Math.floor(params.fim.getTime() / 1000),
      orderStatus: params.orderStatus ?? "ALL",
      limit: LIMITE_POR_PAGINA,
      scrollId,
    });
    nodes.push(...resultado.nodes);
    scrollId = resultado.scrollId ?? undefined;
    pagina++;
    if (!resultado.hasNextPage || !scrollId) break;
  } while (pagina < MAX_PAGINAS);

  return nodes;
}

const PREFIXOS_CANAL = ["facebook", "instagram", "telegram", "whatsapp", "pinterest"];

/**
 * Formato exato de junção do utmContent (quando há mais de um subId) ainda
 * não foi confirmado contra uma amostra real — best-effort: tenta separar
 * por ":", "," ou "|" (os separadores mais comuns nesse tipo de relatório) e
 * procura um segmento que bata com o prefixo de canal que já usamos em
 * lib/shopee/etiquetas.ts. Se não achar nada reconhecível, cai em "outro".
 */
export function canalDoUtmContent(utmContent: string | null): string {
  // API real retorna "----" (não null/vazio) quando o link não levava sub-id — confirmado em produção.
  if (!utmContent || /^-+$/.test(utmContent.trim())) return "sem etiqueta";
  const partes = utmContent
    .split(/[:,|]/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const canal = partes.find((parte) => PREFIXOS_CANAL.some((prefixo) => parte === prefixo || parte.startsWith(`${prefixo}-`)));
  return canal ?? "outro";
}

export interface LinhaRelatorioPorProduto {
  itemId: number;
  itemName: string;
  imageUrl: string | null;
  shopName: string;
  pedidos: number;
  unidades: number;
  comissaoTotal: number;
}

export interface LinhaRelatorioPorCanal {
  canal: string;
  pedidos: number;
  unidades: number;
  comissaoTotal: number;
}

export interface RelatorioConversaoAgregado {
  porProduto: LinhaRelatorioPorProduto[];
  porCanal: LinhaRelatorioPorCanal[];
  totalPedidos: number;
  totalComissao: number;
}

/**
 * Agrega os nodes já buscados por produto e por canal. Cada pedido pode ter
 * vários itens (produtos) — a comissão usada é a do item
 * (itemTotalCommission), não a da conversão como um todo, pra bater com o
 * produto certo quando um pedido mistura itens de canais/campanhas.
 */
export function agregarRelatorioConversao(nodes: RelatorioConversaoNode[]): RelatorioConversaoAgregado {
  const porProduto = new Map<number, LinhaRelatorioPorProduto>();
  const porCanal = new Map<string, LinhaRelatorioPorCanal>();
  let totalPedidos = 0;
  let totalComissao = 0;

  for (const node of nodes) {
    const canal = canalDoUtmContent(node.utmContent);

    for (const pedido of node.pedidos) {
      totalPedidos++;

      for (const item of pedido.itens) {
        totalComissao += item.itemTotalCommission;

        const linhaProduto = porProduto.get(item.itemId) ?? {
          itemId: item.itemId,
          itemName: item.itemName,
          imageUrl: item.imageUrl,
          shopName: item.shopName,
          pedidos: 0,
          unidades: 0,
          comissaoTotal: 0,
        };
        linhaProduto.pedidos++;
        linhaProduto.unidades += item.qty;
        linhaProduto.comissaoTotal += item.itemTotalCommission;
        porProduto.set(item.itemId, linhaProduto);

        const linhaCanal = porCanal.get(canal) ?? { canal, pedidos: 0, unidades: 0, comissaoTotal: 0 };
        linhaCanal.pedidos++;
        linhaCanal.unidades += item.qty;
        linhaCanal.comissaoTotal += item.itemTotalCommission;
        porCanal.set(canal, linhaCanal);
      }
    }
  }

  return {
    porProduto: [...porProduto.values()].sort((a, b) => b.comissaoTotal - a.comissaoTotal),
    porCanal: [...porCanal.values()].sort((a, b) => b.comissaoTotal - a.comissaoTotal),
    totalPedidos,
    totalComissao,
  };
}
