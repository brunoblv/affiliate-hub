"use server";

import { analisarPlanilhaCliques, type RelatorioCliquesAgregado } from "@/lib/shopee/relatorio-cliques";

export type ResultadoAnaliseCliques =
  | { ok: true; relatorio: RelatorioCliquesAgregado }
  | { ok: false; message: string };

/** Analisa o texto colado da planilha "Cliques" exportada do painel de afiliados da Shopee. */
export async function analisarCliquesAction(texto: string): Promise<ResultadoAnaliseCliques> {
  const conteudo = texto.trim();
  if (!conteudo) {
    return { ok: false, message: "Cole o conteúdo da planilha de cliques antes de analisar." };
  }

  try {
    const relatorio = await analisarPlanilhaCliques(conteudo);
    if (relatorio.totalCliques === 0) {
      return { ok: false, message: "Nenhuma linha reconhecida — confira se colou as colunas certas (ID, Período, Região, Sub_id, Referenciador)." };
    }
    return { ok: true, relatorio };
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : "Falha ao analisar a planilha." };
  }
}
