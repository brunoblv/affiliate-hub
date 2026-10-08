/**
 * Dados exibidos nas páginas institucionais (LGPD art. 9º e 41).
 * O site não publica nome, CPF/CNPJ nem endereço do responsável: o canal de
 * contato e do encarregado é só o e-mail. Sem valor, a página mostra um
 * marcador visível em vez de inventar contato.
 */
const missing = (what: string) => `[definir ${what}]`;

export const institutional = {
  siteName: "Capibusca",
  contactEmail: process.env.CONTACT_EMAIL || missing("e-mail de contato"),
  /** Canal do encarregado pelo tratamento de dados pessoais (DPO). */
  dpoEmail: process.env.DPO_EMAIL || process.env.CONTACT_EMAIL || missing("e-mail do encarregado"),
  /** Atualize ao mudar o texto das políticas. */
  policiesUpdatedAt: "07/10/2026",
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
