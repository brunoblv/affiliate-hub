export type SugerirTemaResultado =
  | { ok: true; tema: { titulo: string; resumoPauta: string; palavraChave: string } }
  | { ok: false; erro: string };

export type GerarArtigoResultado =
  | {
      ok: true;
      artigo: { titulo: string; resumo: string; corpo: string; seoTitulo: string; metaDescricao: string };
    }
  | { ok: false; erro: string };
