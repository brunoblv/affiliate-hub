import { FaixaPreco, SeloLanding } from "@/lib/database/enums";

export const LABEL_SELO: Record<SeloLanding, string> = {
  MAIOR_DESCONTO: "Maior desconto",
  MAIS_VENDIDO: "Mais vendido",
  ACHADINHO_DO_DIA: "Achadinho do dia",
  ULTIMAS_UNIDADES: "Últimas unidades",
};

export function reais(valor: unknown): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));
}

export function tituloFaixaAcessivel(teto: number): string {
  return `Achadinhos até ${reais(teto)}`;
}

export { FaixaPreco, SeloLanding };
