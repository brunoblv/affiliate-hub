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

const REDES_CONHECIDAS = ["facebook", "instagram", "telegram", "whatsapp", "pinterest"];

export interface CanalIdentificado {
  /** "facebook" | "instagram" | "telegram" | "whatsapp" | "pinterest" | "outro" | "sem etiqueta". */
  rede: string;
  /** Slug do canal específico (ex. nome do Canal) — null quando não dá pra identificar. */
  canalEspecifico: string | null;
}

/**
 * Formato confirmado em produção (relatório de Cliques da própria Shopee):
 * sub-ids são juntados por "-", sempre 5 posições, vazias viram "----".
 * A partir de subIdsDe (lib/shopee/etiquetas.ts) o esquema novo é
 * [tipo, rede, canal específico] — mas o histórico tem link criado fora
 * desse código (manual no painel da Shopee, Pinterest, tags antigas por
 * categoria) que não segue essa posição. Por isso a busca é por conteúdo
 * (acha a rede em qualquer posição), não por índice fixo — funciona pro
 * esquema novo e não quebra pro legado, só perde o "canal específico" do
 * legado (fica null, cai em "outro" na agregação por rede se nem a rede
 * for reconhecível).
 */
export function identificarCanal(utmContent: string | null): CanalIdentificado {
  if (!utmContent || /^-+$/.test(utmContent.trim())) return { rede: "sem etiqueta", canalEspecifico: null };

  const partes = utmContent
    .split("-")
    .map((parte) => parte.trim().toLowerCase())
    .filter(Boolean);
  if (partes.length === 0) return { rede: "sem etiqueta", canalEspecifico: null };

  const indiceRede = partes.findIndex((parte) => REDES_CONHECIDAS.some((rede) => parte === rede || parte.startsWith(rede)));
  if (indiceRede === -1) return { rede: "outro", canalEspecifico: null };

  const rede = REDES_CONHECIDAS.find((r) => partes[indiceRede] === r || partes[indiceRede]!.startsWith(r))!;
  return { rede, canalEspecifico: partes[indiceRede + 1] ?? null };
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
  rede: string;
  pedidos: number;
  unidades: number;
  comissaoTotal: number;
}

export interface LinhaRelatorioPorCanalEspecifico {
  rede: string;
  /** null = rede identificada mas sem canal específico no sub-id (link antigo, ou só 2 slots usados). */
  canalEspecifico: string | null;
  pedidos: number;
  unidades: number;
  comissaoTotal: number;
}

export interface RelatorioConversaoAgregado {
  porProduto: LinhaRelatorioPorProduto[];
  porCanal: LinhaRelatorioPorCanal[];
  porCanalEspecifico: LinhaRelatorioPorCanalEspecifico[];
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
  const porCanalEspecifico = new Map<string, LinhaRelatorioPorCanalEspecifico>();
  let totalPedidos = 0;
  let totalComissao = 0;

  for (const node of nodes) {
    const { rede, canalEspecifico } = identificarCanal(node.utmContent);
    const chaveEspecifica = `${rede}::${canalEspecifico ?? ""}`;

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

        const linhaCanal = porCanal.get(rede) ?? { rede, pedidos: 0, unidades: 0, comissaoTotal: 0 };
        linhaCanal.pedidos++;
        linhaCanal.unidades += item.qty;
        linhaCanal.comissaoTotal += item.itemTotalCommission;
        porCanal.set(rede, linhaCanal);

        const linhaEspecifica = porCanalEspecifico.get(chaveEspecifica) ?? {
          rede,
          canalEspecifico,
          pedidos: 0,
          unidades: 0,
          comissaoTotal: 0,
        };
        linhaEspecifica.pedidos++;
        linhaEspecifica.unidades += item.qty;
        linhaEspecifica.comissaoTotal += item.itemTotalCommission;
        porCanalEspecifico.set(chaveEspecifica, linhaEspecifica);
      }
    }
  }

  return {
    porProduto: [...porProduto.values()].sort((a, b) => b.comissaoTotal - a.comissaoTotal),
    porCanal: [...porCanal.values()].sort((a, b) => b.comissaoTotal - a.comissaoTotal),
    porCanalEspecifico: [...porCanalEspecifico.values()].sort((a, b) => b.comissaoTotal - a.comissaoTotal),
    totalPedidos,
    totalComissao,
  };
}
