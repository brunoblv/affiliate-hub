import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";

export interface ProdutoLarSmartResumo {
  slug: string;
  nome: string;
  imagem: string | null;
  origem: "catalogo" | "shopee";
}

export type GerarTemaLarSmartResultado =
  | { ok: true; pauta: PautaListaCasa; produtos: ProdutoLarSmartResumo[]; doCatalogo: number; doShopee: number }
  | { ok: false; erro: string };

export type GerarArtigoLarSmartResultado =
  | { ok: true; postId: string; slug: string; titulo: string; produtos: Array<{ slug: string; nome: string }> }
  | { ok: false; erro: string };

export type AlvoImagemLarSmart = { tipo: "CAPA" } | { tipo: "PRODUTO"; slug: string };

export type GerarImagemLarSmartResultado =
  | { ok: true; url: string; alt: string | null }
  | { ok: false; erro: string };

export type TrocarProdutoLarSmartResultado =
  | { ok: true; produtoAntigoSlug: string; produtoNovo: ProdutoLarSmartResumo; imagemUrl: string | null }
  | { ok: false; erro: string };
