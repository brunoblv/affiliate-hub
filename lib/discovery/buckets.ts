/**
 * Buckets de descoberta (docs/especificacao-automacao-produtos-chartfm.md §2/§3):
 * cada bucket é uma busca por termos-chave num projeto específico. Um mesmo
 * produto pode surgir em buscas diferentes; a deduplicação por (source, externalId)
 * evita duplicar o registro em Product.
 *
 * Termos por bucket — ajustar livremente conforme os resultados reais das buscas.
 */
export interface DiscoveryBucket {
  projectSlug: string;
  label: string;
  keywords: string[];
}

export const DISCOVERY_BUCKETS: DiscoveryBucket[] = [
  {
    projectSlug: "umbanda",
    label: "Umbanda",
    keywords: [
      "vela para umbanda",
      "incenso umbanda",
      "defumador ervas",
      "pemba umbanda",
      "guia umbanda contas",
      "imagem orixá",
      "roupa branca umbanda",
      "livro umbanda",
    ],
  },
  {
    projectSlug: "meu-novo-lar",
    label: "Casa",
    keywords: [
      "eletrodomestico cozinha",
      "organizador multiuso casa",
      "kit ferramentas manuais",
      "utensilio cozinha",
      "furadeira parafusadeira",
      "decoração casa",
      "iluminação casa",
      "organizador armario",
    ],
  },
  {
    projectSlug: "chartfm",
    label: "Música",
    keywords: ["disco de vinil lp", "vinil importado", "cd música nacional", "fone de ouvido música", "instrumento musical"],
  },
];

/**
 * Termo genérico usado para varrer "promoções de qualquer tipo" (spec §2: "Não
 * buscar somente promoções", mas incluir uma varredura ampla por ofertas do dia
 * além das buscas por categoria). Os resultados são classificados no bucket
 * "meu-novo-lar" por padrão quando não casam com nenhuma palavra-chave dos
 * outros buckets — ver classifyPromotionBucket.
 */
export const PROMOTION_SWEEP_TERMS = ["oferta do dia", "promoção"];
