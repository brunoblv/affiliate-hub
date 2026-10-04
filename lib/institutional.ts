/**
 * Dados do operador exibidos nas páginas institucionais (LGPD art. 9º e 41).
 * Vêm do ambiente para não ficarem fixos no código; sem valor, a página mostra
 * um marcador visível em vez de inventar identidade ou contato.
 */
const missing = (what: string) => `[definir ${what}]`;

export const institutional = {
  siteName: "Capibusca",
  operatorName: process.env.OPERATOR_NAME || missing("nome ou razão social do operador"),
  operatorDocument: process.env.OPERATOR_DOCUMENT || missing("CPF/CNPJ"),
  operatorAddress: process.env.OPERATOR_ADDRESS || missing("cidade/UF ou endereço"),
  contactEmail: process.env.CONTACT_EMAIL || missing("e-mail de contato"),
  /** Encarregado pelo tratamento de dados pessoais (DPO). */
  dpoName: process.env.DPO_NAME || process.env.OPERATOR_NAME || missing("encarregado de dados"),
  dpoEmail: process.env.DPO_EMAIL || process.env.CONTACT_EMAIL || missing("e-mail do encarregado"),
  /** Atualize ao mudar o texto das políticas. */
  policiesUpdatedAt: "04/10/2026",
};

export const institutionalLinks = [
  { href: "/sobre", label: "Sobre" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/afiliados", label: "Divulgação de afiliados" },
  { href: "/contato", label: "Contato" },
  { href: "/politica-de-privacidade", label: "Política de privacidade" },
  { href: "/politica-de-cookies", label: "Política de cookies" },
  { href: "/termos-de-uso", label: "Termos de uso" },
] as const;
