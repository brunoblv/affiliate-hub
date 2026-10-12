/**
 * Pontuação de candidatos a produto (0-100). Função pura: só usa o que a API da loja informa.
 * Pesos: demanda 35, confiança 20, marca 15, desconto 10, comissão 10, faixa de preço 10.
 */
export interface ScoreInput {
  salesCount: number | null;
  /** 0–500 (centésimos de estrela). */
  ratingCentis: number | null;
  ratingCount: number | null;
  /** 0 = sem marca, 1 = marca conhecida, 2 = marca forte (`Brand.weight`). */
  brandWeight: number;
  officialStore: boolean | null;
  discountPct: number | null;
  /** Centésimos de ponto percentual. */
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

  const sales = input.salesCount ?? 0;
  const demand = sales > 0 ? clamp(Math.log10(sales + 1) / Math.log10(20_001)) * 35 : 0;
  if (sales >= 100) reasons.push(`${compact(sales)} vendas`);
  else reasons.push(sales > 0 ? "poucas vendas" : "sem vendas registradas");

  // Nota ausente não pontua nem pesa contra. Nota alta com poucas avaliações vale menos:
  // o fator de volume vem do número de avaliações (fonte que não informa vale metade).
  const rating = (input.ratingCentis ?? 0) / 100;
  const count = input.ratingCount;
  const volume = count === null ? 0.5 : clamp(Math.log10(count + 1) / Math.log10(2_001));
  const trust = rating > 0 ? clamp((rating - 3.5) / 1.5) * volume * 20 : 0;
  if (rating >= 4.5) reasons.push(`nota ${decimal(rating)}${count ? ` (${compact(count)} avaliações)` : ""}`);
  else if (rating > 0 && rating < 4) reasons.push(`nota baixa (${decimal(rating)})`);

  const brandPoints = input.brandWeight >= 2 ? 15 : input.brandWeight === 1 ? 10 : 0;
  const brand = Math.min(15, brandPoints + (input.officialStore ? 5 : 0));
  if (input.brandWeight > 0) reasons.push("marca conhecida");
  if (input.officialStore) reasons.push("loja oficial");

  const discountPct = input.discountPct ?? 0;
  const discount = clamp(discountPct / 50) * 10;
  if (discountPct >= 10) reasons.push(`${Math.round(discountPct)}% de desconto`);

  const commissionPct = (input.commissionPct ?? 0) / 100;
  const commission = clamp(commissionPct / 15) * 10;
  if (commissionPct >= 5) reasons.push(`comissão ${decimal(commissionPct)}%`);

  // Ticket muito baixo rende pouca comissão por venda; faixa média é a mais comparável.
  const reais = input.priceCents / 100;
  const price = reais >= 30 && reais <= 800 ? 10 : reais >= 15 ? 5 : 0;
  if (reais < 15) reasons.push("preço muito baixo");

  let value = demand + trust + brand + discount + commission + price;
  // Sem volume mínimo de vendas o resto não sustenta um bom candidato.
  if (sales < 10) value = Math.min(value, 35);
  // Nota alta sustentada por pouquíssimas avaliações também tem teto.
  if (count !== null && count < 10 && rating >= 4.5) value = Math.min(value, 50);
  return { value: Math.round(value), reasons };
}
