import { createReadStream } from "node:fs";

/**
 * Leitura e pontuação do Datafeed da Shopee (CSV grande, com descrições de várias linhas).
 * O `product_short link` do feed NÃO carrega o código de afiliado (o redirecionamento não traz
 * utm_source=an_… nem utm_medium=affiliates), então o feed só alimenta a descoberta: o link de
 * afiliado real vem da API, produto a produto.
 */

/** Lê o CSV em streaming (RFC 4180: aspas, aspas duplicadas e quebras de linha dentro de campo). */
export async function* readCsv(path: string): AsyncGenerator<Record<string, string>> {
  let header: string[] | null = null;
  let field = "";
  let row: string[] = [];
  let quoted = false;
  let pendingQuote = false; // vimos uma aspa dentro de campo entre aspas: fecha ou é aspa escapada?
  let first = true;

  const finishRow = (): Record<string, string> | null => {
    row.push(field);
    field = "";
    const values = row;
    row = [];
    if (!header) {
      header = values.map((name) => name.trim());
      return null;
    }
    if (values.length === 1 && values[0] === "") return null; // linha em branco
    const record: Record<string, string> = {};
    header.forEach((name, index) => {
      record[name] = values[index] ?? "";
    });
    return record;
  };

  for await (const chunk of createReadStream(path, { encoding: "utf8", highWaterMark: 1 << 20 })) {
    let text = chunk as string;
    if (first) {
      text = text.replace(/^﻿/, "");
      first = false;
    }
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (char === '"') {
          field += '"';
          continue;
        }
        quoted = false; // a aspa anterior fechou o campo; `char` é tratado abaixo como fora de aspas
      }
      if (quoted) {
        if (char === '"') pendingQuote = true;
        else field += char;
      } else if (char === '"' && field === "") {
        quoted = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        const record = finishRow();
        if (record) yield record;
      } else if (char !== "\r") {
        field += char;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    const record = finishRow();
    if (record) yield record;
  }
}

export interface FeedCandidate {
  itemId: string;
  shopId: string;
  title: string;
  category1: string;
  category2: string;
  priceCents: number;
  rating: number;
  likes: number | null;
  shopRating: number | null;
  discountPct: number;
  score: number;
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const num = (value: string | undefined) => {
  const parsed = Number((value ?? "").trim());
  return value && Number.isFinite(parsed) ? parsed : null;
};

/**
 * Filtra e pontua uma linha do feed. Devolve null quando não serve (usado, importado do exterior,
 * sem foto, nota baixa, preço muito baixo…). O feed não traz vendas: a nota usa avaliação do produto,
 * da loja, curtidas, desconto e faixa de preço — normalizada só pelos campos que a linha tem.
 */
export function scoreFeedRow(row: Record<string, string>): FeedCandidate | null {
  if ((row.condition ?? "New") !== "New") return null;
  if ((row.cb_option ?? "") === "Cross border") return null;
  if (!row.image_link) return null;

  const itemId = row.itemid;
  const link = (row.product_link ?? "").match(/\/product\/(\d+)\/(\d+)/);
  if (!itemId || !link || link[2] !== itemId) return null;

  const title = (row.title ?? "").trim();
  if (title.length < 15) return null;

  const rating = num(row.item_rating);
  if (rating === null || rating < 4.6) return null;

  const price = num(row.sale_price) ?? num(row.price);
  if (price === null || price < 20) return null;

  const likes = num(row.like);
  const shopRating = num(row.shop_rating);
  const discountPct = clamp((num(row.discount_percentage) ?? 0) / 100, 0, 1) * 100;

  let points = clamp((rating - 4.6) / 0.4) * 35 + clamp(discountPct / 50) * 15;
  let max = 50;
  if (likes !== null) {
    points += clamp(Math.log10(likes + 1) / Math.log10(5001)) * 30;
    max += 30;
  }
  if (shopRating !== null) {
    points += clamp((shopRating - 4.5) / 0.5) * 10;
    max += 10;
  }
  const reais = price;
  points += reais >= 30 && reais <= 800 ? 10 : 5;
  max += 10;

  return {
    itemId,
    shopId: link[1],
    title,
    category1: row.global_category1 ?? "",
    category2: row.global_category2 ?? "",
    priceCents: Math.round(price * 100),
    rating,
    likes,
    shopRating,
    discountPct,
    score: Math.round((points / max) * 100),
  };
}

const normalizeTitle = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 45);

/**
 * Ordena por pontuação com teto por categoria (para a primeira leva não ficar dominada por uma
 * só) e descarta anúncios repetidos (mesmo item ou mesmo título normalizado).
 */
export function selectDiverse(candidates: FeedCandidate[], options: { total: number; perCategory: number }): FeedCandidate[] {
  const seenItems = new Set<string>();
  const seenTitles = new Set<string>();
  const perCategory = new Map<string, number>();
  const picked: FeedCandidate[] = [];

  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    if (picked.length >= options.total) break;
    const title = normalizeTitle(candidate.title);
    if (seenItems.has(candidate.itemId) || seenTitles.has(title)) continue;
    const used = perCategory.get(candidate.category1) ?? 0;
    if (used >= options.perCategory) continue;
    seenItems.add(candidate.itemId);
    seenTitles.add(title);
    perCategory.set(candidate.category1, used + 1);
    picked.push(candidate);
  }
  return picked;
}
