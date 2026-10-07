import { prisma } from "@/lib/db";
import { generateJson, modelChain } from "@/lib/gemini";
import { ensureProductShortcodes } from "@/lib/blog/body";
import { fill, loadPrompt } from "./prompts";

/**
 * Ficha de um produto (post PRODUCT): a IA escreve o texto a partir dos fatos do
 * catálogo; preço, foto e botão de compra ficam no card do [produto:slug].
 */
export interface ProductSheet {
  corpo: string;
  resumo: string;
  seoTitulo: string;
  metaDescricao: string;
}

const SHEET_SCHEMA = {
  type: "OBJECT",
  properties: {
    corpo: { type: "STRING" },
    descricao: { type: "STRING" },
    resumo: { type: "STRING" },
    notaEditorial: { type: "STRING" },
    seoTitulo: { type: "STRING" },
    metaDescricao: { type: "STRING" },
  },
  required: ["corpo", "descricao", "resumo", "notaEditorial", "seoTitulo", "metaDescricao"],
};

/** Tira HTML e comprime espaço: descrição de marketplace costuma vir suja. */
export function cleanDescription(raw: string | null | undefined, limit = 1500): string {
  if (!raw) return "";
  const text = raw.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

/** Fatos do produto para os prompts: resumo, ficha técnica e material de referência do admin. */
export async function productFacts(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { name: true } },
      niches: { include: { niche: { select: { name: true } } }, take: 1 },
      content: { select: { sourceMaterial: true } },
      variants: { include: { offers: { where: { active: true }, include: { store: { select: { name: true } } } } } },
    },
  });
  if (!product) return null;
  const specs = Array.isArray(product.specs)
    ? product.specs.flatMap((item) => (item && typeof item === "object" && "key" in item ? [`${String(item.key)}: ${String((item as { value?: unknown }).value ?? "")}`] : []))
    : product.specs && typeof product.specs === "object"
      ? Object.entries(product.specs).map(([key, value]) => `${key}: ${String(value)}`)
      : [];
  const stores = [...new Set(product.variants.flatMap((variant) => variant.offers.map((offer) => offer.store.name)))];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.name ?? product.niches[0]?.niche.name ?? "casa",
    stores,
    description: cleanDescription([product.summary, specs.join("; "), product.content?.sourceMaterial].filter(Boolean).join(" — ")),
  };
}

export async function writeProductSheet(blog: { subdomain: string; name: string }, productId: string): Promise<ProductSheet> {
  const facts = await productFacts(productId);
  if (!facts) throw new Error("Produto não encontrado no catálogo.");

  const prompt = fill(await loadPrompt(blog.subdomain, "ficha-produto.md"), {
    nome: facts.name,
    slug: facts.slug,
    categoria: facts.category,
    destino: blog.name,
    plataforma: facts.stores.join(", ") || "lojas monitoradas pelo Capibusca",
    descricao: facts.description || "(sem descrição da loja)",
    notaEditorial: "(nenhuma)",
  });

  const { data } = await generateJson<ProductSheet>({
    prompt,
    schema: SHEET_SCHEMA,
    temperature: 0.8,
    maxOutputTokens: 4096,
    timeoutMs: 45_000,
    models: modelChain("article"),
  });
  return { ...data, corpo: ensureProductShortcodes(data.corpo, [facts.slug]) };
}
