/**
 * Pontuação de candidatos a produto (0-100). Função pura: só usa o que a API da loja informa.
 * Pesos: demanda 45, confiança 20, desconto 15, comissão 10, faixa de preço 10.
 */
export interface ScoreInput {
  sales: number | null;
  rating: number | null;
  discountPct: number | null;
  commissionPct: number | null;
  priceCents: number;
  hasImage: boolean;
}

export interface Score {
  value: number;
  reasons: string[];
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const decimal = (n: number) => n.toFixed(1).replace(".", ",");

function compact(n: number): string {
  if (n >= 1_000_000) return `${decimal(n / 1_000_000)} mi`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`;
  return String(n);
}

export function scoreCandidate(input: ScoreInput): Score {
  const reasons: string[] = [];
  if (!input.hasImage) return { value: 0, reasons: ["sem foto"] };

  const sales = input.sales ?? 0;
  const demand = sales > 0 ? clamp(Math.log10(sales + 1) / Math.log10(20_001)) * 45 : 0;
  if (sales >= 100) reasons.push(`${compact(sales)} vendas`);
  else reasons.push(sales > 0 ? "poucas vendas" : "sem vendas registradas");

  // Nota 0 significa "sem avaliação", não "ruim": não pontua nem pesa contra.
  const rating = input.rating ?? 0;
  const trust = rating > 0 ? clamp((rating - 3.5) / 1.5) * 20 : 0;
  if (rating >= 4.5) reasons.push(`nota ${decimal(rating)}`);
  else if (rating > 0 && rating < 4) reasons.push(`nota baixa (${decimal(rating)})`);

  const discountPct = input.discountPct ?? 0;
  const discount = clamp(discountPct / 50) * 15;
  if (discountPct >= 10) reasons.push(`${Math.round(discountPct)}% de desconto`);

  const commissionPct = input.commissionPct ?? 0;
  const commission = clamp(commissionPct / 15) * 10;
  if (commissionPct >= 5) reasons.push(`comissão ${decimal(commissionPct)}%`);

  // Ticket muito baixo rende pouca comissão por venda; faixa média é a mais comparável.
  const reais = input.priceCents / 100;
  const price = reais >= 30 && reais <= 800 ? 10 : reais >= 15 ? 5 : 0;
  if (reais < 15) reasons.push("preço muito baixo");

  const raw = demand + trust + discount + commission + price;
  // Sem volume mínimo de vendas o resto não sustenta um bom candidato.
  const value = Math.round(sales < 10 ? Math.min(raw, 35) : raw);
  return { value, reasons };
}
