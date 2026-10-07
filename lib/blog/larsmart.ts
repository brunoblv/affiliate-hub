import { prisma } from "@/lib/db";
import { generateJson, modelChain } from "@/lib/gemini";
import type { Prisma } from "@/lib/generated/prisma/client";
import { shopeeConnector } from "@/lib/connectors/shopee";
import { searchShopee } from "@/lib/discovery/shopee";
import { attachFetchedOffer, createDraftProduct } from "@/lib/admin/import-offer";
import { slugify } from "@/lib/slug";
import { insertImageBeforeProduct, referencedProducts, replaceProductSection } from "@/lib/blog/body";
import { fill, loadPrompt } from "@/lib/blog/ai/prompts";
import { generateCover, generateProductScene } from "@/lib/blog/covers/generate";
import { saveImage } from "@/lib/media/storage";
import { eligibleProducts, family, pickProducts, writeList, type ListBrief } from "@/lib/blog/lists";
import { syncPostRelations, uniquePostSlug } from "@/lib/blog/posts";

/**
 * LarSmart: do tema livre ao rascunho de lista com imagens.
 * 1. a IA interpreta o tema (título, ângulo, termos de produto);
 * 2. escolhe produtos no catálogo publicado; se faltar, importa da Shopee como rascunho;
 * 3. a IA escreve o texto e o post nasce RASCUNHO;
 * 4. capa e uma cena por produto (OpenAI), uma chamada por imagem.
 */
export interface LarSmartProduct {
  slug: string;
  name: string;
  image: string | null;
  source: "catalogo" | "shopee";
  /** Rascunho no catálogo: o card só aparece no post depois de publicado. */
  draft: boolean;
}

interface Interpretation {
  titulo: string;
  angulo: string;
  termosNome: string[];
  comodo: string;
  quantidade: number;
}

const THEME_SCHEMA = {
  type: "OBJECT",
  properties: {
    titulo: { type: "STRING" },
    angulo: { type: "STRING" },
    termosNome: { type: "ARRAY", items: { type: "STRING" } },
    comodo: { type: "STRING" },
    quantidade: { type: "INTEGER" },
  },
  required: ["titulo", "angulo", "termosNome", "comodo", "quantidade"],
};

type BlogRef = { id: string; subdomain: string };

export async function interpretTopic(blog: BlogRef, topic: string): Promise<ListBrief> {
  const clean = topic.trim();
  if (!clean) throw new Error("Digite uma ideia de artigo antes de gerar.");
  const { data } = await generateJson<Interpretation>({
    prompt: fill(await loadPrompt(blog.subdomain, "larsmart-interpretar-tema.md"), { topico: clean }),
    schema: THEME_SCHEMA,
    temperature: 0.6,
    maxOutputTokens: 2048,
    timeoutMs: 25_000,
    models: modelChain("short"),
  });
  const terms = [...new Set(data.termosNome.map((term) => term.trim().toLowerCase()).filter(Boolean))];
  if (!terms.length) throw new Error("Não consegui extrair termos de produto desse tema. Descreva a ideia com mais detalhe.");
  const title = data.titulo.trim() || clean;
  return {
    id: `larsmart-${slugify(title)}`,
    grupo: "tema",
    dica: data.comodo?.trim() || null,
    titulo: title,
    angulo: data.angulo.trim() || clean,
    termos: terms,
    quantidade: data.quantidade === 4 ? 4 : 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  };
}

export function isListBrief(value: unknown): value is ListBrief {
  if (!value || typeof value !== "object") return false;
  const brief = value as Record<string, unknown>;
  return typeof brief.titulo === "string" && typeof brief.angulo === "string" && Array.isArray(brief.termos) && typeof brief.quantidade === "number";
}

async function describe(slugs: string[]): Promise<LarSmartProduct[]> {
  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, status: true, images: { where: { broken: false }, orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } } },
  });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return slugs.flatMap((slug) => {
    const row = bySlug.get(slug);
    if (!row) return [];
    return [{
      slug,
      name: row.name,
      image: row.images[0]?.url ?? null,
      source: row.status === "PUBLISHED" ? "catalogo" : "shopee",
      draft: row.status !== "PUBLISHED",
    }];
  });
}

/** Busca na Shopee e importa (rascunho) até completar a lista; nunca repete família de produto. */
async function importFromShopee(brief: ListBrief, missing: number, families: Set<string>): Promise<string[]> {
  if (missing <= 0 || !shopeeConnector.isConfigured()) return [];
  const store = await prisma.store.findFirst({ where: { connector: shopeeConnector.key, active: true } });
  if (!store) return [];

  const imported: string[] = [];
  for (const term of (brief.termos.length ? brief.termos : [brief.titulo]).slice(0, 3)) {
    if (imported.length >= missing) break;
    let page;
    try {
      page = await searchShopee({ kind: "keyword", keyword: term }, "relevance", 1);
    } catch (error) {
      console.error("[larsmart] busca na Shopee falhou:", error instanceof Error ? error.message : error);
      break;
    }
    for (const candidate of page.candidates) {
      if (imported.length >= missing) break;
      const key = family(candidate.name);
      if (families.has(key)) continue;

      const existing = await prisma.offer.findFirst({
        where: { storeId: store.id, externalListingId: candidate.itemId },
        select: { variant: { select: { product: { select: { slug: true } } } } },
      });
      if (existing) {
        families.add(key);
        imported.push(existing.variant.product.slug);
        continue;
      }
      try {
        const result = await shopeeConnector.fetchOffer({ externalListingId: candidate.itemId, externalSellerId: candidate.shopId, originalUrl: null });
        if (result.kind !== "ok" || !result.title || !result.affiliateUrl) continue;
        const product = await createDraftProduct({ name: result.title, nicheIds: [], categoryId: null });
        await attachFetchedOffer({
          productId: product.id,
          variantId: product.variants[0]!.id,
          store,
          listingId: candidate.itemId,
          sellerId: candidate.shopId,
          originalUrl: `https://shopee.com.br/product/${candidate.shopId}/${candidate.itemId}`,
          result,
        });
        families.add(key);
        imported.push(product.slug);
      } catch (error) {
        console.error("[larsmart] falha ao importar da Shopee:", error instanceof Error ? error.message : error);
      }
      await new Promise((resolve) => setTimeout(resolve, shopeeConnector.limits.minIntervalMs));
    }
  }
  return imported;
}

/** Catálogo publicado primeiro; Shopee completa o que faltar. Precisa de pelo menos 3. */
export async function selectProducts(blog: BlogRef, brief: ListBrief, exclude: string[] = []) {
  const pool = (await eligibleProducts()).filter((item) => !exclude.includes(item.slug));
  const fromCatalog = (await pickProducts(blog.id, brief, pool)).map((item) => item.slug);
  const families = new Set([...fromCatalog, ...exclude].map((slug) => family(slug.replace(/-/g, " "))));
  const fromShopee = (await importFromShopee(brief, brief.quantidade - fromCatalog.length, families)).filter((slug) => !exclude.includes(slug));
  const slugs = [...fromCatalog, ...fromShopee].slice(0, brief.quantidade);
  if (slugs.length < 3 && exclude.length === 0) {
    throw new Error(`Só achei ${slugs.length} produto(s) para "${brief.titulo}" (preciso de pelo menos 3). Descreva o tema de outro jeito ou cadastre mais produtos desse tipo.`);
  }
  return { products: await describe(slugs), fromCatalog: fromCatalog.length, fromShopee: fromShopee.length };
}

async function productsForWriting(slugs: string[]) {
  const rows = await prisma.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true, summary: true } });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return slugs.flatMap((slug) => {
    const row = bySlug.get(slug);
    return row ? [{ slug, name: row.name, description: row.summary ?? "" }] : [];
  });
}

/** Escreve o texto e cria o post como RASCUNHO (as imagens vêm nos passos seguintes). */
export async function createDraft(blog: BlogRef, brief: ListBrief, slugs: string[], authorName: string | null) {
  const products = await productsForWriting(slugs);
  const article = await writeList(blog, brief, products);
  const post = await prisma.post.create({
    data: {
      blogId: blog.id,
      kind: "LIST",
      category: "HOME_TIPS",
      title: article.titulo,
      slug: await uniquePostSlug(blog.id, article.titulo),
      summary: article.resumo || null,
      body: article.corpo,
      seoTitle: article.seoTitulo || null,
      metaDescription: article.metaDescricao || null,
      status: "DRAFT",
      safetyNotice: brief.avisoSeguranca,
      authorName,
      larsmartBrief: brief as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, slug: true, title: true },
  });
  await syncPostRelations(post.id, article.corpo);
  return { ...post, products: products.map((item) => ({ slug: item.slug, name: item.name })) };
}

/** upsert manual: o unique (postId, productId, kind) não protege NULL duplicado no Postgres. */
async function recordImage(data: { postId: string; productId: string | null; kind: "COVER" | "PRODUCT"; mediaId: string; prompt: string; pinterestTitle: string; pinterestDescription: string | null }) {
  const existing = await prisma.larSmartImage.findFirst({ where: { postId: data.postId, productId: data.productId, kind: data.kind }, select: { id: true } });
  if (existing) await prisma.larSmartImage.update({ where: { id: existing.id }, data });
  else await prisma.larSmartImage.create({ data });
}

export type ImageTarget = { kind: "COVER" } | { kind: "PRODUCT"; slug: string };

export async function generateImageFor(blog: BlogRef, postId: string, target: ImageTarget) {
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { id: true, title: true, summary: true, body: true, larsmartBrief: true } });
  const brief = post.larsmartBrief as unknown as ListBrief | null;

  if (target.kind === "COVER") {
    const cover = await generateCover({
      blog,
      kind: "LIST",
      title: post.title,
      summary: post.summary,
      body: post.body,
      productSlugs: [...new Set(referencedProducts(post.body))],
      hint: brief?.dica ?? null,
      allowFallback: true,
    });
    await prisma.post.update({ where: { id: postId }, data: { coverId: cover.id } });
    await recordImage({ postId, productId: null, kind: "COVER", mediaId: cover.id, prompt: "capa (generateCover)", pinterestTitle: post.title, pinterestDescription: post.summary });
    return { url: cover.url, alt: cover.alt };
  }

  const product = await prisma.product.findUnique({ where: { slug: target.slug }, select: { id: true, slug: true, name: true } });
  if (!product) throw new Error(`Produto "${target.slug}" não encontrado.`);
  const scene = await generateProductScene(blog, product, post.summary ?? post.title);
  const media = await saveImage({ buffer: scene.buffer, originalName: `${product.slug}.png`, alt: `${product.name} em um ambiente decorado`, quality: 88 });
  await recordImage({ postId, productId: product.id, kind: "PRODUCT", mediaId: media.id, prompt: scene.prompt, pinterestTitle: product.name, pinterestDescription: post.summary });

  const body = insertImageBeforeProduct(post.body, product.slug, `![${media.alt ?? product.name}](${media.url})`);
  if (body !== post.body) {
    await prisma.post.update({ where: { id: postId }, data: { body } });
    await syncPostRelations(postId, body);
  }
  return { url: media.url, alt: media.alt };
}

/** Reescreve só o texto (mesma pauta e produtos), sem mexer nas imagens já geradas. */
export async function regenerateText(blog: BlogRef, postId: string) {
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { body: true, larsmartBrief: true } });
  const brief = post.larsmartBrief as unknown as ListBrief | null;
  if (!brief) throw new Error("Este post não foi gerado pelo LarSmart; edite manualmente.");
  const article = await writeList(blog, brief, await productsForWriting([...new Set(referencedProducts(post.body))]));
  await prisma.post.update({
    where: { id: postId },
    data: { title: article.titulo, summary: article.resumo || null, body: article.corpo, seoTitle: article.seoTitulo || null, metaDescription: article.metaDescricao || null },
  });
  await syncPostRelations(postId, article.corpo);
}

/** Troca um produto por outro do tema (catálogo, senão Shopee) sem reescrever a prosa. */
export async function swapProduct(blog: BlogRef, postId: string, oldSlug: string) {
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { title: true, summary: true, body: true, larsmartBrief: true } });
  const brief = post.larsmartBrief as unknown as ListBrief | null;
  if (!brief) throw new Error("Este post não foi gerado pelo LarSmart; edite manualmente.");

  const used = [...new Set(referencedProducts(post.body))];
  const { products } = await selectProducts(blog, { ...brief, quantidade: 1 }, used);
  const replacement = products[0];
  if (!replacement) throw new Error("Não achei outro produto relevante para esse tema.");

  const product = await prisma.product.findUniqueOrThrow({ where: { slug: replacement.slug }, select: { id: true, slug: true, name: true } });
  let imageMarkdown: string | null = null;
  try {
    const scene = await generateProductScene(blog, product, post.summary ?? post.title);
    const media = await saveImage({ buffer: scene.buffer, originalName: `${product.slug}.png`, alt: `${product.name} em um ambiente decorado`, quality: 88 });
    await recordImage({ postId, productId: product.id, kind: "PRODUCT", mediaId: media.id, prompt: scene.prompt, pinterestTitle: product.name, pinterestDescription: post.summary });
    imageMarkdown = `![${media.alt ?? product.name}](${media.url})`;
  } catch (error) {
    // Sem imagem (OpenAI fora): troca o produto mesmo assim e tira a imagem antiga da seção.
    console.error("[larsmart] cena do produto falhou:", error instanceof Error ? error.message : error);
  }

  const body = replaceProductSection(post.body, oldSlug, product.slug, product.name, imageMarkdown);
  await prisma.post.update({ where: { id: postId }, data: { body } });
  await syncPostRelations(postId, body);
  return replacement;
}
