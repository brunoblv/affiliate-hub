/**
 * Lista única de ferramentas anunciadas no site (home e /ferramentas) —
 * evita duas listas divergentes linkando para rotas que não existem.
 * Toda ferramenta aqui precisa ter uma page.tsx implementada em
 * app/(site)/ferramentas/<slug do href>.
 */
export type Ferramenta = {
  category: string;
  title: string;
  description: string;
  href: string;
};

export const FERRAMENTAS: Ferramenta[] = [
  {
    category: "CONSTRUÇÃO",
    title: "Calculadora de tinta",
    description: "Descubra quantos litros você precisa comprar.",
    href: "/ferramentas/calculadora-de-tinta",
  },
  {
    category: "CONSTRUÇÃO",
    title: "Calculadora de piso",
    description: "Calcule a metragem certa para o seu ambiente.",
    href: "/ferramentas/calculadora-de-piso",
  },
];
