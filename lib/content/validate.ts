import { normalize } from "@/lib/search-text";
import { EMPTY_SECTIONS, SECTION_KEYS, type ContentIssue, type ContentSections, type SectionKey } from "./types";

// ---------------------------------------------------------------------------
// Sanitização: o que vem do modelo (ou de um formulário) vira um objeto no formato certo
// ---------------------------------------------------------------------------

const LIMITS = {
  title: 120,
  summary: 320,
  description: 3000,
  benefit: 220,
  benefits: 8,
  audience: 500,
  howToUse: 1800,
  limitation: 240,
  limitations: 8,
  faqQuestion: 180,
  faqAnswer: 600,
  faq: 6,
  metaTitle: 70,
  metaDescription: 170,
};

/** Tira HTML, links e espaços sobrando: o texto é exibido como texto puro. */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

const list = (value: unknown, itemMax: number, max: number): string[] =>
  Array.isArray(value)
    ? value.map((item) => clean(item, itemMax)).filter(Boolean).slice(0, max)
    : [];

export function sanitizeSections(raw: unknown): ContentSections {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const faqRaw = Array.isArray(source.faq) ? source.faq : [];
  return {
    title: clean(source.title, LIMITS.title),
    summary: clean(source.summary, LIMITS.summary),
    description: clean(source.description, LIMITS.description),
    benefits: list(source.benefits, LIMITS.benefit, LIMITS.benefits),
    audience: clean(source.audience, LIMITS.audience),
    howToUse: clean(source.howToUse, LIMITS.howToUse) || null,
    limitations: list(source.limitations, LIMITS.limitation, LIMITS.limitations),
    faq: faqRaw
      .map((item) => {
        const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return { question: clean(entry.question, LIMITS.faqQuestion), answer: clean(entry.answer, LIMITS.faqAnswer) };
      })
      .filter((entry) => entry.question && entry.answer)
      .slice(0, LIMITS.faq),
    metaTitle: clean(source.metaTitle, LIMITS.metaTitle),
    metaDescription: clean(source.metaDescription, LIMITS.metaDescription),
  };
}

export function asSections(value: unknown): ContentSections {
  return value ? sanitizeSections(value) : { ...EMPTY_SECTIONS };
}

// ---------------------------------------------------------------------------
// Validação editorial: o que o texto NÃO pode afirmar
// ---------------------------------------------------------------------------

/** Texto de cada seção, para varrer com as regras. */
function textOf(sections: ContentSections, key: SectionKey): string {
  const value = sections[key];
  if (value === null) return "";
  if (typeof value === "string") return value;
  return value.map((item) => (typeof item === "string" ? item : `${item.question} ${item.answer}`)).join("\n");
}

interface Rule {
  pattern: RegExp;
  message: string;
  severity: "error" | "warning";
  /** Se verdadeiro, o termo é aceito quando aparece no material de referência. */
  allowIfInSource?: boolean;
}

const RULES: Rule[] = [
  {
    pattern: /R\$\s?\d|\b\d+([.,]\d+)?\s*(reais|real)\b|\bpor apenas\b|\bem promo[cç][aã]o\b|\bdesconto de\b/i,
    message: "Menciona preço ou desconto. O preço vem do banco, não do texto.",
    severity: "error",
  },
  {
    pattern:
      /\b(mais vendid[oa]|best[- ]?seller|campe[aã]o de vendas|sucesso de vendas|milhares de (clientes|pessoas|unidades|consumidores)|queridinh[oa]|viraliz\w*|todo mundo (usa|tem)|mais popular|famos[oa]|muito procurad[oa]|tend[eê]ncia do momento)\b/i,
    message: "Afirma popularidade sem evidência registrada. Use “Destaques do produto” com características reais.",
    severity: "error",
  },
  {
    pattern:
      /\b(eu|n[oó]s)\s+(testei|testamos|usei|usamos|comprei|compramos|experimentei|experimentamos|avaliei|avaliamos)\b|\btestamos\b|\bnossos? testes?\b|\bna nossa experi[eê]ncia\b|\bem nossos testes\b/i,
    message: "Inventa experiência pessoal ou teste. O site não testou o produto.",
    severity: "error",
  },
  {
    pattern:
      /\b(certificad[oa]|aprovad[oa] pel[ao] anvisa|registro na anvisa|selo do inmetro|clinicamente (testad|comprovad)\w*|dermatologicamente testad\w*|comprovad[oa] cientificamente|cura|previne|trata(mento)? de|elimina \d+%)\b/i,
    message: "Alegação de certificação, saúde ou eficácia sem estar no material de referência.",
    severity: "error",
    allowIfInSource: true,
  },
  {
    pattern: /\b(imperd[ií]vel|revolucion[aá]ri\w*|melhor do mercado|n[aã]o pode ficar de fora|prepare-se|voc[eê] vai se surpreender|incr[ií]vel|perfeit[oa] para todos)\b/i,
    message: "Tom de anúncio. Prefira explicar o produto como a um amigo.",
    severity: "warning",
  },
  {
    pattern: /\b(comparador|afiliad[oa]s?|comiss[aã]o|nosso site|aqui no site)\b/i,
    message: "Fala do próprio site. O texto deve tratar só do produto.",
    severity: "warning",
  },
];

export function validateSections(sections: ContentSections, sourceMaterial: string | null): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const source = normalize(sourceMaterial ?? "");

  for (const key of SECTION_KEYS) {
    const text = textOf(sections, key);
    if (!text) continue;
    for (const rule of RULES) {
      const match = text.match(rule.pattern);
      if (!match) continue;
      if (rule.allowIfInSource && source.includes(normalize(match[0]))) continue;
      issues.push({ section: key, severity: rule.severity, message: `${rule.message} (“${match[0]}”)` });
    }
  }

  if (sections.howToUse && !sourceMaterial?.trim()) {
    issues.push({
      section: "howToUse",
      severity: "error",
      message: "Modo de uso sem fonte: o material do fabricante não foi informado.",
    });
  }
  if (!sections.title) issues.push({ section: "title", severity: "error", message: "Falta o título editorial." });
  if (!sections.description) issues.push({ section: "description", severity: "error", message: "Falta a descrição." });
  if (sections.metaDescription.length > 160) {
    issues.push({ section: "metaDescription", severity: "warning", message: "Passa de 160 caracteres e pode ser cortada nos buscadores." });
  }
  return issues;
}

export const hasErrors = (issues: ContentIssue[]) => issues.some((issue) => issue.severity === "error");
