import { prisma } from "@/lib/db";
import { generateJson, modelChain } from "@/lib/gemini";
import { slugify } from "@/lib/slug";
import { ensureProductShortcodes } from "@/lib/blog/body";
import { cleanDescription } from "@/lib/blog/ai/product-sheet";
import { fill, loadBlogJson, loadPrompt } from "@/lib/blog/ai/prompts";

/**
 * Posts LIST ("5 produtos indispensáveis na cozinha"): os produtos vêm do catálogo do
 * comparador (publicados, com oferta e link de afiliado ativos) e a IA escreve a
 * utilidade de cada um. Preço e botão ficam no card do [produto:slug].
 */
export interface ListBrief {
  id: string;
  grupo: "comodo" | "tema";
  /** Cômodo/tema que orienta a cena da capa. */
  dica?: string | null;
  titulo: string;
  angulo: string;
  /** Palavras que "parecem" do cômodo/tema: prioridade na escolha. */
  termos: string[];
  quantidade: number;
  preferirPromocao: boolean;
  avisoSeguranca: boolean;
}

export interface ListCandidate {
  id: string;
  slug: string;
  name: string;
  description: string;
  lowestCents: number;
  previousCents: number | null;
  hasImage: boolean;
  createdAt: Date;
}

export interface ListArticle {
  titulo: string;
  resumo: string;
  corpo: string;
  seoTitulo: string;
  metaDescricao: string;
}

const RECENT_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;

export async function listBriefs(subdomain: string): Promise<ListBrief[]> {
  try {
    return (await loadBlogJson<{ pautas: ListBrief[] }>(subdomain, "listas.json")).pautas;
  } catch {
    return [];
  }
}

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function matches(name: string, terms: string[]): boolean {
  if (!terms.length) return false;
  const target = normalize(name);
  return terms.some((term) => target.includes(normalize(term)));
}

/** Primeiras 2 palavras do nome: detecta produtos quase iguais na mesma lista. */
export function family(name: string): string {
  const slug = slugify(name);
  return slug.split("-").slice(0, 2).join("-") || slug;
}

const hasDiscount = (item: ListCandidate) => item.previousCents !== null && item.previousCents > item.lowestCents;

/** Produtos publicados com oferta pública (preço, loja ativa e link de afiliado ativo). */
export async function eligibleProducts(): Promise<ListCandidate[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      variants: { some: { offers: { some: { active: true, priceCents: { not: null }, store: { active: true }, links: { some: { active: true } } } } } },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      createdAt: true,
      images: { where: { broken: false }, take: 1, select: { id: true } },
      variants: {
        select: {
          offers: {
            where: { active: true, priceCents: { not: null }, store: { active: true }, links: { some: { active: true } } },
            select: { priceCents: true, previousPriceCents: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 3000,
  });
  return rows.flatMap((row) => {
    const offers = row.variants.flatMap((variant) => variant.offers).sort((a, b) => a.priceCents! - b.priceCents!);
    const best = offers[0];
    if (!best?.priceCents) return [];
    return [{
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.summary ?? "",
      lowestCents: best.priceCents,
      previousCents: best.previousPriceCents,
      hasImage: row.images.length > 0,
      createdAt: row.createdAt,
    }];
  });
}

async function recentlyUsed(blogId: string): Promise<Set<string>> {
  const items = await prisma.postProduct.findMany({
    where: { post: { blogId, kind: "LIST", createdAt: { gte: new Date(Date.now() - RECENT_WINDOW_MS) } } },
    select: { productId: true },
  });
  return new Set(items.map((item) => item.productId));
}

function score(item: ListCandidate, brief: ListBrief, used: Set<string>): number {
  let points = 0;
  if (matches(item.name, brief.termos)) points += 24;
  if (hasDiscount(item)) points += brief.preferirPromocao ? 18 : 8;
  if (item.hasImage) points += 6;
  if (item.description.trim()) points += 3;
  if (used.has(item.id)) points -= 16;
  if ((Date.now() - item.createdAt.getTime()) / 86_400_000 <= 21) points += 4;
  return points;
}

/**
 * Escolhe os produtos da pauta: nome do cômodo/tema e promoção primeiro, evitando itens
 * da mesma "família" e os já usados em listas recentes do blog.
 */
export async function pickProducts(blogId: string, brief: ListBrief, pool?: ListCandidate[]): Promise<ListCandidate[]> {
  const all = pool ?? (await eligibleProducts());
  const used = await recentlyUsed(blogId);
  const ranked = [...all].sort((a, b) => score(b, brief, used) - score(a, brief, used));
  const withTerm = brief.termos.length ? ranked.filter((item) => matches(item.name, brief.termos)) : ranked;

  const chosen: ListCandidate[] = [];
  const families = new Set<string>();
  const pull = (source: ListCandidate[], distinctFamily: boolean) => {
    for (const item of source) {
      if (chosen.length >= brief.quantidade) break;
      if (chosen.some((existing) => existing.id === item.id)) continue;
      const key = family(item.name);
      if (distinctFamily && families.has(key)) continue;
      families.add(key);
      chosen.push(item);
    }
  };
  // Sem termo combinando, não completa com produto aleatório do catálogo: lista fora do tema é pior que lista curta.
  pull(withTerm, true);
  pull(withTerm, false);

  if (brief.preferirPromocao) {
    const onSale = chosen.filter(hasDiscount);
    if (onSale.length >= 3) return onSale.slice(0, brief.quantidade);
  }
  return chosen.slice(0, brief.quantidade);
}

const LIST_SCHEMA = {
  type: "OBJECT",
  properties: {
    titulo: { type: "STRING" },
    resumo: { type: "STRING" },
    corpo: { type: "STRING" },
    seoTitulo: { type: "STRING" },
    metaDescricao: { type: "STRING" },
  },
  required: ["titulo", "resumo", "corpo", "seoTitulo", "metaDescricao"],
};

function productBlock(item: { slug: string; name: string; description: string }, index: number): string {
  const description = cleanDescription(item.description, 280) || "(sem descrição da loja — fale só da utilidade típica, sem inventar spec)";
  return [`${index}. slug: ${item.slug}`, `   nome: ${item.name}`, `   descricao: ${description}`].join("\n");
}

/** A IA escreve a utilidade de cada produto e posiciona os shortcodes. */
export async function writeList(
  blog: { subdomain: string },
  brief: Pick<ListBrief, "titulo" | "angulo">,
  products: { slug: string; name: string; description: string }[],
): Promise<ListArticle> {
  if (products.length < 3) {
    throw new Error(`Poucos produtos no catálogo para "${brief.titulo}" (achei ${products.length}, preciso de pelo menos 3 com oferta ativa). Publique mais itens desse tipo.`);
  }
  const prompt = fill(await loadPrompt(blog.subdomain, "lista-casa.md"), {
    titulo: brief.titulo,
    angulo: brief.angulo,
    quantidade: String(products.length),
    produtos: products.map((item, i) => productBlock(item, i + 1)).join("\n\n"),
  });
  const { data } = await generateJson<ListArticle>({
    prompt,
    schema: LIST_SCHEMA,
    temperature: 0.85,
    maxOutputTokens: 8192,
    timeoutMs: 45_000,
    models: modelChain("article"),
  });
  const title = data.titulo.trim() || brief.titulo;
  return {
    titulo: title,
    resumo: data.resumo.trim(),
    corpo: ensureProductShortcodes(data.corpo, products.map((item) => item.slug)),
    seoTitulo: data.seoTitulo.trim() || title,
    metaDescricao: data.metaDescricao.trim() || data.resumo.trim(),
  };
}
