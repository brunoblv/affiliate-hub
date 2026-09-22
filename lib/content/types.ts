/** Seções do conteúdo editorial de um produto (RF-13). */
export interface ContentSections {
  title: string;
  summary: string;
  description: string;
  benefits: string[];
  audience: string;
  /** null quando o material do fabricante não traz instruções. */
  howToUse: string | null;
  limitations: string[];
  faq: { question: string; answer: string }[];
  metaTitle: string;
  metaDescription: string;
}

export type SectionKey = keyof ContentSections;

export const SECTION_KEYS: SectionKey[] = [
  "title",
  "summary",
  "description",
  "benefits",
  "audience",
  "howToUse",
  "limitations",
  "faq",
  "metaTitle",
  "metaDescription",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  title: "Título editorial",
  summary: "Resumo",
  description: "Descrição",
  benefits: "Destaques do produto",
  audience: "Para quem faz sentido",
  howToUse: "Como usar",
  limitations: "Cuidados e limitações",
  faq: "Perguntas frequentes",
  metaTitle: "Título para buscadores",
  metaDescription: "Descrição para buscadores",
};

export interface ContentIssue {
  section: SectionKey | "geral";
  severity: "error" | "warning";
  message: string;
}

export const EMPTY_SECTIONS: ContentSections = {
  title: "",
  summary: "",
  description: "",
  benefits: [],
  audience: "",
  howToUse: null,
  limitations: [],
  faq: [],
  metaTitle: "",
  metaDescription: "",
};

export const PROMPT_VERSION = "v1";
