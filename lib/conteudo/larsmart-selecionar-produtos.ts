import { prisma, Categoria, Destino } from "@/lib/database";
import { ehForaDoTemaCasa } from "@/lib/nicho";
import { LABEL_CATEGORIA } from "@/lib/produtos";
import { registrar } from "@/lib/log";
import { buscarOfertasShopee } from "@/lib/shopee/client";
import { importarOfertaShopee } from "@/lib/shopee/importar-oferta";
import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";
import {
  escolherProdutosDaPauta,
  familia,
  produtosElegiveisParaLista,
  type ProdutoCandidatoLista,
} from "@/lib/conteudo/escolher-produtos-lista";

export type ProdutoLarSmartCandidato = ProdutoCandidatoLista & { origem: "catalogo" | "shopee" };

export interface SelecaoLarSmart {
  produtos: ProdutoLarSmartCandidato[];
  doCatalogo: number;
  doShopee: number;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

/** Categoria mais provável do candidato entre as sugeridas pra pauta — evita marcar tudo com a primeira só. */
function categoriaDoCandidato(nome: string, categorias: Categoria[]): Categoria {
  if (categorias.length <= 1) return categorias[0] ?? Categoria.CASA;
  const alvo = nome.toLowerCase();
  const combina = categorias.find((cat) => alvo.includes(LABEL_CATEGORIA[cat].toLowerCase()));
  return combina ?? categorias[0]!;
}

const CAMPOS_CANDIDATO = {
  id: true,
  slug: true,
  nome: true,
  categoria: true,
  descricao: true,
  precoAtual: true,
  precoOriginal: true,
  imagens: true,
  criadoEm: true,
  destino: true,
  ativo: true,
  linkAfiliado: true,
} as const;

/**
 * Seleciona os produtos do tema: catálogo interno primeiro (mesmo score/
 * diversidade do gerar-lista), Shopee como fallback quando faltar produto —
 * item importado entra no catálogo público de verdade (sujeito ao filtro de
 * nicho), não fica "só no artigo".
 */
export async function selecionarProdutosLarSmart(pauta: PautaListaCasa): Promise<SelecaoLarSmart> {
  const pool = await produtosElegiveisParaLista();
  const doCatalogoDireto = await escolherProdutosDaPauta(pauta, pool);
  const selecionados: ProdutoLarSmartCandidato[] = doCatalogoDireto.map((p) => ({ ...p, origem: "catalogo" }));
  const doCatalogo = selecionados.length;

  if (selecionados.length < pauta.quantidade) {
    const familiasUsadas = new Set(selecionados.map((p) => familia(p.nome)));
    const termos = pauta.termosNome.slice(0, 3);

    buscaShopee: for (const termo of termos.length > 0 ? termos : [pauta.titulo]) {
      if (selecionados.length >= pauta.quantidade) break;

      let ofertas;
      try {
        ofertas = await buscarOfertasShopee({ keyword: termo, sortType: 1, limit: 20 });
      } catch (erro) {
        await registrar("ERRO", "LARSMART", "Busca na Shopee falhou — seguindo só com o que achei no catálogo.", {
          termo,
          erro: mensagemErro(erro),
        });
        break buscaShopee;
      }

      for (const oferta of ofertas) {
        if (selecionados.length >= pauta.quantidade) break;
        if (ehForaDoTemaCasa(oferta.nome)) continue;

        const chaveFamilia = familia(oferta.nome);
        if (familiasUsadas.has(chaveFamilia)) continue;

        let resultado;
        try {
          resultado = await importarOfertaShopee({
            oferta,
            categoria: categoriaDoCandidato(oferta.nome, pauta.categorias),
            destino: Destino.MEU_NOVO_LAR,
            origem: "larsmart",
          });
        } catch (erro) {
          await registrar("ERRO", "LARSMART", "Falha ao importar oferta da Shopee.", {
            oferta: oferta.nome,
            erro: mensagemErro(erro),
          });
          continue;
        }

        if (resultado.status !== "importado" && resultado.status !== "atualizado") continue;

        const produto = await prisma.produto.findUnique({
          where: { id: resultado.id },
          select: CAMPOS_CANDIDATO,
        });
        if (!produto || !produto.linkAfiliado.trim()) continue;

        familiasUsadas.add(chaveFamilia);
        selecionados.push({ ...produto, origem: "shopee" });
      }
    }
  }

  if (selecionados.length < 3) {
    throw new Error(
      `Só achei ${selecionados.length} produto(s) relevante(s) pra "${pauta.titulo}" (preciso de pelo menos 3). Descreva o tema de outro jeito ou importe mais produtos desse tipo.`,
    );
  }

  const finais = selecionados.slice(0, pauta.quantidade);
  return { produtos: finais, doCatalogo: Math.min(doCatalogo, finais.length), doShopee: Math.max(0, finais.length - doCatalogo) };
}
