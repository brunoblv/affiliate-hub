import { Platform } from "@/lib/generated/prisma/client";

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
  /**
   * Se definido, a busca deste bucket roda só nessas plataformas
   * (ex.: Achadinhos Tik Tok → apenas TIKTOK_SHOP).
   */
  platforms?: Platform[];
  /** Slug da Category do projeto — grava Product.categoryId na descoberta. */
  categorySlug?: string;
}

/** Slug do projeto focado só em TikTok Shop (página + grupo próprios). */
export const ACHADINHOS_TIKTOK_PROJECT_SLUG = "achadinhos-tiktok";

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
  // Achadinhos Tik Tok — só TikTok Shop; um bucket por categoria para gravar categoryId.
  {
    projectSlug: ACHADINHOS_TIKTOK_PROJECT_SLUG,
    label: "Beleza",
    categorySlug: "achadinhos-tiktok-beleza-e-cuidados",
    platforms: [Platform.TIKTOK_SHOP],
    keywords: ["kit maquiagem promoção", "skincare facial barato", "secador de cabelo portatil", "escova alisadora"],
  },
  {
    projectSlug: ACHADINHOS_TIKTOK_PROJECT_SLUG,
    label: "Casa",
    categorySlug: "achadinhos-tiktok-casa-e-organizacao",
    platforms: [Platform.TIKTOK_SHOP],
    keywords: ["organizador gaveta", "luz led fita", "gancho adesivo parede", "caixa organizadora"],
  },
  {
    projectSlug: ACHADINHOS_TIKTOK_PROJECT_SLUG,
    label: "Cozinha",
    categorySlug: "achadinhos-tiktok-cozinha",
    platforms: [Platform.TIKTOK_SHOP],
    keywords: ["air fryer mini", "espremedor de alho", "utensilio cozinha silicone", "garrafa termica"],
  },
  {
    projectSlug: ACHADINHOS_TIKTOK_PROJECT_SLUG,
    label: "Gadgets",
    categorySlug: "achadinhos-tiktok-eletronicos-e-gadgets",
    platforms: [Platform.TIKTOK_SHOP],
    keywords: ["carregador portatil", "fone bluetooth barato", "suporte celular carro", "ring light"],
  },
  {
    projectSlug: ACHADINHOS_TIKTOK_PROJECT_SLUG,
    label: "Moda",
    categorySlug: "achadinhos-tiktok-moda-e-acessorios",
    platforms: [Platform.TIKTOK_SHOP],
    keywords: ["bolsa feminina promoção", "óculos de sol", "cinto feminino", "meia cano alto"],
  },
  {
    projectSlug: ACHADINHOS_TIKTOK_PROJECT_SLUG,
    label: "Utilidades",
    categorySlug: "achadinhos-tiktok-utilidades",
    platforms: [Platform.TIKTOK_SHOP],
    keywords: ["achadinhos tiktok", "produto viral tiktok", "utilidade doméstica promoção", "kit limpeza casa"],
  },
];

/**
 * Termo genérico usado para varrer "promoções de qualquer tipo" (spec §2: "Não
 * buscar somente promoções", mas incluir uma varredura ampla por ofertas do dia
 * além das buscas por categoria). Os resultados são classificados no bucket
 * "meu-novo-lar" por padrão quando não casam com nenhuma palavra-chave dos
 * outros buckets — ver classifyPromotionBucket. Promoções vindas do TikTok Shop
 * caem no projeto Achadinhos Tik Tok.
 */
export const PROMOTION_SWEEP_TERMS = ["oferta do dia", "promoção"];
