export type ArtigoListaGerado = {
  titulo: string;
  resumo: string;
  corpo: string;
  seoTitulo: string;
  metaDescricao: string;
  avisoSeguranca: boolean;
  produtos: Array<{ slug: string; nome: string }>;
};

export type GerarListaResultado =
  | { ok: true; artigo: ArtigoListaGerado }
  | { ok: false; erro: string };

export type SalvarListaResultado =
  | { ok: true; postId: string; slug: string; titulo: string; agendados: number }
  | { ok: false; erro: string };
