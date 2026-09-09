import { prisma } from "@/lib/database";
import { TAMANHO_FRAGMENTO_PRODUTO } from "./etiquetas";

const REDES_CONHECIDAS = ["facebook", "instagram", "telegram", "whatsapp", "pinterest"];

export interface LinhaCliqueBruta {
  idClique: string;
  periodo: string;
  regiao: string;
  subId: string;
  referenciador: string;
}

/**
 * Upload do CSV exportado da tela "Cliques" no painel de afiliados da Shopee
 * (ex. WebsiteClickReportAAAAMMDDHHmm.csv) — não existe endpoint da
 * Affiliate Open API pra isso. Aceita também colar direto (TSV do
 * Excel/Sheets). Colunas esperadas, nessa ordem: ID dos Cliques, Tempo dos
 * Cliques, Região dos Cliques, Sub_id, Referenciador — cabeçalho na primeira
 * linha, detectado e descartado (se não bater, a 1ª linha vira dado, o que
 * só polui a contagem em 1 registro, não quebra o parsing).
 */
export function parsearPlanilhaCliques(textoOriginal: string): LinhaCliqueBruta[] {
  // BOM do UTF-8 (﻿) — comum em CSV exportado de painel web/Excel.
  const texto = textoOriginal.replace(/^﻿/, "").replace(/^ï»¿/, "");

  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const linhasCliques: LinhaCliqueBruta[] = [];

  for (const linha of linhas) {
    const colunas = linha.includes("\t") ? linha.split("\t") : linha.split(",");
    if (colunas.length < 5) continue;

    const [idClique, periodo, regiao, subId, referenciador] = colunas.map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!idClique || /^id\s*dos?\s*cliques?$/i.test(idClique)) continue; // cabeçalho

    linhasCliques.push({
      idClique: idClique!,
      periodo: periodo ?? "",
      regiao: regiao ?? "",
      subId: subId ?? "",
      referenciador: referenciador ?? "",
    });
  }

  return linhasCliques;
}

export interface CanalDoClique {
  rede: string;
  canalEspecifico: string | null;
  fragmentoProduto: string | null;
}

/**
 * Mesma lógica de busca-por-conteúdo do relatório de conversão (ver
 * lib/shopee/relatorio-conversao.ts) pra achar a rede — histórico tem link
 * fora do esquema atual, então não dá pra confiar em posição fixa pra isso.
 * Já canal-específico vs. fragmento de produto é por POSIÇÃO, não por
 * tamanho (subIdsDe sempre põe o fragmento por último): usar tamanho sozinho
 * falha quando o nome do canal tem coincidentemente o mesmo tamanho do
 * fragmento (ex. "achadinhos" tem 10 caracteres, igual a
 * TAMANHO_FRAGMENTO_PRODUTO).
 */
export function identificarCliqueDoSubId(subId: string): CanalDoClique {
  if (!subId || /^-+$/.test(subId.trim())) return { rede: "sem etiqueta", canalEspecifico: null, fragmentoProduto: null };

  const partes = subId
    .split("-")
    .map((parte) => parte.trim().toLowerCase())
    .filter(Boolean);
  if (partes.length === 0) return { rede: "sem etiqueta", canalEspecifico: null, fragmentoProduto: null };

  const indiceRede = partes.findIndex((parte) => REDES_CONHECIDAS.some((rede) => parte === rede || parte.startsWith(rede)));
  if (indiceRede === -1) return { rede: "outro", canalEspecifico: null, fragmentoProduto: null };

  const rede = REDES_CONHECIDAS.find((r) => partes[indiceRede] === r || partes[indiceRede]!.startsWith(r))!;
  const resto = partes.slice(indiceRede + 1);

  let canalEspecifico: string | null = null;
  let fragmentoProduto: string | null = null;
  if (resto.length >= 2) {
    canalEspecifico = resto[0]!;
    fragmentoProduto = resto[resto.length - 1]!;
  } else if (resto.length === 1) {
    if (resto[0]!.length === TAMANHO_FRAGMENTO_PRODUTO) fragmentoProduto = resto[0]!;
    else canalEspecifico = resto[0]!;
  }

  return { rede, canalEspecifico, fragmentoProduto };
}

export interface LinhaRelatorioCliquesPorRede {
  rede: string;
  cliques: number;
}

export interface LinhaRelatorioCliquesPorCanal {
  rede: string;
  canalEspecifico: string | null;
  cliques: number;
}

export interface LinhaRelatorioCliquesPorProduto {
  produtoId: string;
  nome: string | null;
  slug: string | null;
  cliques: number;
}

export interface RelatorioCliquesAgregado {
  totalCliques: number;
  totalLinhasSemProduto: number;
  porRede: LinhaRelatorioCliquesPorRede[];
  porCanal: LinhaRelatorioCliquesPorCanal[];
  porProduto: LinhaRelatorioCliquesPorProduto[];
}

/**
 * Cruza o fragmento de produto (últimos TAMANHO_FRAGMENTO_PRODUTO caracteres
 * do id) com o banco via `endsWith` — não é índice, é scan, mas a tabela de
 * produtos não é grande o bastante pra isso pesar numa análise manual e
 * ocasional como essa.
 */
export async function analisarPlanilhaCliques(texto: string): Promise<RelatorioCliquesAgregado> {
  const linhas = parsearPlanilhaCliques(texto);

  const porRede = new Map<string, LinhaRelatorioCliquesPorRede>();
  const porCanal = new Map<string, LinhaRelatorioCliquesPorCanal>();
  const contagemPorFragmento = new Map<string, number>();
  let totalLinhasSemProduto = 0;

  for (const linha of linhas) {
    const { rede, canalEspecifico, fragmentoProduto } = identificarCliqueDoSubId(linha.subId);

    const linhaRede = porRede.get(rede) ?? { rede, cliques: 0 };
    linhaRede.cliques++;
    porRede.set(rede, linhaRede);

    const chaveCanal = `${rede}::${canalEspecifico ?? ""}`;
    const linhaCanal = porCanal.get(chaveCanal) ?? { rede, canalEspecifico, cliques: 0 };
    linhaCanal.cliques++;
    porCanal.set(chaveCanal, linhaCanal);

    if (fragmentoProduto) {
      contagemPorFragmento.set(fragmentoProduto, (contagemPorFragmento.get(fragmentoProduto) ?? 0) + 1);
    } else {
      totalLinhasSemProduto++;
    }
  }

  const porProduto: LinhaRelatorioCliquesPorProduto[] = [];
  for (const [fragmento, cliques] of contagemPorFragmento) {
    const produto = await prisma.produto.findFirst({
      where: { id: { endsWith: fragmento } },
      select: { id: true, nome: true, slug: true },
    });
    porProduto.push({
      produtoId: produto?.id ?? fragmento,
      nome: produto?.nome ?? null,
      slug: produto?.slug ?? null,
      cliques,
    });
  }

  return {
    totalCliques: linhas.length,
    totalLinhasSemProduto,
    porRede: [...porRede.values()].sort((a, b) => b.cliques - a.cliques),
    porCanal: [...porCanal.values()].sort((a, b) => b.cliques - a.cliques),
    porProduto: porProduto.sort((a, b) => b.cliques - a.cliques),
  };
}
