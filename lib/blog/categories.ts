import type { EditorialCategory, PostKind } from "@/lib/generated/prisma/enums";

/**
 * Linhas editoriais. Os prompts de cada uma ficam em content/blogs/<subdomain>/prompts/
 * (cada blog tem voz própria); as de "jornada" recebem as notas pessoais como contexto
 * para a IA não inventar detalhes.
 */
export interface CategoryConfig {
  label: string;
  /** Prompt que sugere temas novos. */
  briefPrompt: string;
  /** Prompt que escreve o artigo. */
  articlePrompt: string;
  /** Prompt que acrescenta o bloco de opinião própria a um artigo existente. */
  opinionPrompt: string;
  usesJourneyNotes: boolean;
}

export const CATEGORIES: Record<EditorialCategory, CategoryConfig> = {
  HOME_TIPS: {
    label: "Dicas de casa",
    briefPrompt: "pauta-editorial.md",
    articlePrompt: "artigo-editorial.md",
    opinionPrompt: "adicionar-opiniao-dicas-casa.md",
    usesJourneyNotes: false,
  },
  APARTMENT_JOURNEY: {
    label: "Jornada do apartamento",
    briefPrompt: "pauta-jornada-apartamento.md",
    articlePrompt: "artigo-jornada-apartamento.md",
    opinionPrompt: "adicionar-opiniao-jornada-apartamento.md",
    usesJourneyNotes: true,
  },
  SPIRITUAL_JOURNEY: {
    label: "Minha jornada espiritual",
    briefPrompt: "pauta-jornada-espiritual.md",
    articlePrompt: "artigo-jornada-espiritual.md",
    opinionPrompt: "adicionar-opiniao-jornada-espiritual.md",
    usesJourneyNotes: true,
  },
  SPIRITUAL_REFLECTION: {
    label: "Espiritualidade",
    briefPrompt: "pauta-reflexao-espiritual.md",
    articlePrompt: "artigo-reflexao-espiritual.md",
    opinionPrompt: "adicionar-opiniao-reflexao-espiritual.md",
    usesJourneyNotes: false,
  },
  SPIRITUALITY_GUIDE: {
    label: "Guias",
    briefPrompt: "pauta-guia-espiritualidade.md",
    articlePrompt: "artigo-guia-espiritualidade.md",
    opinionPrompt: "adicionar-opiniao-guia-espiritualidade.md",
    usesJourneyNotes: false,
  },
};

export const ALL_CATEGORIES = Object.keys(CATEGORIES) as EditorialCategory[];

export function isCategory(value: string | null | undefined): value is EditorialCategory {
  return !!value && value in CATEGORIES;
}

export const KIND_LABELS: Record<PostKind, string> = {
  EDITORIAL: "Editorial",
  PRODUCT: "Produto",
  LIST: "Lista",
};

export const ALL_KINDS = Object.keys(KIND_LABELS) as PostKind[];

export function isKind(value: string | null | undefined): value is PostKind {
  return !!value && value in KIND_LABELS;
}
