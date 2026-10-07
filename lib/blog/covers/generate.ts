import sharp from "sharp";
import { prisma } from "@/lib/db";
import type { PostKind } from "@/lib/generated/prisma/enums";
import { slugify } from "@/lib/slug";
import { saveImage } from "@/lib/media/storage";
import { referencedProducts } from "@/lib/blog/body";
import { loadBlogJson } from "@/lib/blog/ai/prompts";
import { blogTheme } from "@/lib/blog/themes";
import { composeLocal, composeWithScene, imageBuffer, pickVariant, type CoverKind } from "./compose";
import { editImage, generateImage, isOpenAiConfigured } from "./openai";

/**
 * Capa do post: a OpenAI monta a cena do tema (com as fotos reais dos produtos, nas
 * listas) e ela é colada na moldura da marca do blog. Os temas de cena ficam em
 * content/blogs/<sub>/capas.json.
 */
interface SceneConfig {
  themes: { id: string; label: string; terms: string[]; scene: string }[];
  defaultTheme: { id: string; label: string; scene: string };
  moods: Record<string, string>;
  defaultMood: string;
  roles: Record<CoverKind, string>;
  style: string;
}

const MAX_PRODUCT_PHOTOS = 5;

export const coverKindOf = (kind: PostKind): CoverKind => (kind === "LIST" ? "lista" : kind === "PRODUCT" ? "produto" : "jornada");

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function pickTheme(config: SceneConfig, text: string) {
  const haystack = normalize(text);
  return config.themes.find((theme) => theme.terms.some((term) => haystack.includes(normalize(term)))) ?? config.defaultTheme;
}

export function scenePrompt(config: SceneConfig, input: { kind: CoverKind; title: string; summary?: string | null; hint?: string | null; variant: string; products: string[] }): string {
  const theme = pickTheme(config, [input.hint, input.title, input.summary].filter(Boolean).join(" "));
  const mood = config.moods[`${input.kind}:${input.variant}`] ?? config.defaultMood;
  const products = input.products.length
    ? `Reference photos are the real products, in this order:\n${input.products.map((name, i) => `${i + 1}. ${name}`).join("\n")}\nPlace those exact products in a natural montage inside the scene — on a counter, shelf, bed or table that matches the theme. Keep each product's shape, color and labels recognizable. Do not invent extra competing products. Do not make a grid, catalog collage, marketplace screenshot or floating cutouts on white.`
    : "No product photos. Invent a truthful lifestyle scene for the theme — objects that belong in that room, not a product catalog.";
  return [
    `Photorealistic 16:9 ${config.roles[input.kind]}.`,
    `Article title (do not render as text): "${input.title}".`,
    `Theme: ${theme.label}. Scene: ${theme.scene}.`,
    `Color grading should sit comfortably next to a brand frame in ${mood}.`,
    products,
    config.style,
    "No people with readable faces, no text, no letters, no watermarks, no prices, no logos added, no UI, no magazine headline.",
    "Output only the photographic scene.",
  ].join("\n");
}

/** Fotos de referência dos produtos (catálogo), redimensionadas para a API. */
export async function productPhotos(slugs: string[]) {
  if (!slugs.length) return [];
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, images: { where: { broken: false }, orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } } },
  });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const photos: { name: string; label: string; url: string; buffer: Buffer }[] = [];
  for (const slug of slugs.slice(0, MAX_PRODUCT_PHOTOS)) {
    const product = bySlug.get(slug);
    const url = product?.images[0]?.url;
    if (!product || !url) continue;
    try {
      const buffer = await sharp(await imageBuffer(url)).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      photos.push({ name: `${slugify(product.name).slice(0, 40) || slug}.jpg`, label: product.name, url, buffer });
    } catch {
      // CDN da loja fora do ar: segue com as que deram certo.
    }
  }
  return photos;
}

export interface CoverInput {
  blog: { subdomain: string };
  kind: PostKind;
  title: string;
  summary?: string | null;
  body?: string | null;
  /** Slugs já resolvidos; vazio = lê os [produto:slug] do corpo. */
  productSlugs?: string[];
  /** Cômodo/tema que desempata a cena (ex.: "cozinha"). */
  hint?: string | null;
  /** Sem OpenAI (ou se ela falhar), compõe localmente em vez de dar erro. */
  allowFallback?: boolean;
}

export async function generateCoverImage(input: CoverInput): Promise<Buffer> {
  const subdomain = input.blog.subdomain;
  const kind = coverKindOf(input.kind);
  const variant = pickVariant(`${kind}:${input.title}:${Date.now()}`);
  const slugs = input.productSlugs?.length ? input.productSlugs : referencedProducts(input.body ?? "");
  const photos = await productPhotos(slugs);
  const headingFont = blogTheme(subdomain).headingFont;

  const local = async () => {
    const cover = await composeLocal(subdomain, kind, variant, input.title, photos[0]?.url ?? null, headingFont);
    if (!cover) throw new Error(`O blog não tem fundo de capa em content/blogs/${subdomain}/fundos/capa/${kind}/.`);
    return cover;
  };

  if (!isOpenAiConfigured()) {
    if (!input.allowFallback) throw new Error("OpenAI não configurado: defina OPENAI_API_KEY.");
    return local();
  }

  try {
    const config = await loadBlogJson<SceneConfig>(subdomain, "capas.json");
    const prompt = scenePrompt(config, { kind, title: input.title, summary: input.summary, hint: input.hint, variant, products: photos.map((photo) => photo.label) });
    const scene = photos.length
      ? await editImage(prompt, photos.map((photo) => ({ name: photo.name, buffer: photo.buffer, mime: "image/jpeg" as const })))
      : await generateImage(prompt);
    const cover = await composeWithScene(subdomain, kind, variant, scene);
    if (!cover) throw new Error(`O blog não tem fundo de capa em content/blogs/${subdomain}/fundos/capa/${kind}/.`);
    return cover;
  } catch (error) {
    console.error("[capa] falha na OpenAI:", error instanceof Error ? error.message : error);
    if (!input.allowFallback) throw error;
    return local();
  }
}

/** Gera e salva na biblioteca de mídia; devolve o registro para gravar em Post.coverId. */
export async function generateCover(input: CoverInput) {
  const buffer = await generateCoverImage(input);
  return saveImage({ buffer, originalName: `${slugify(input.title).slice(0, 60) || "capa"}.png`, alt: input.title, quality: 88 });
}

/** Cena de um produto sozinho (LarSmart): foto crua de ambiente, sem moldura. */
export async function generateProductScene(blog: { subdomain: string }, product: { slug: string; name: string }, angle: string) {
  const config = await loadBlogJson<SceneConfig>(blog.subdomain, "capas.json");
  const photos = await productPhotos([product.slug]);
  const prompt = scenePrompt(config, { kind: "produto", title: product.name, summary: angle, variant: "1.png", products: photos.slice(0, 1).map((photo) => photo.label) });
  const buffer = photos[0]
    ? await editImage(prompt, [{ name: photos[0].name, buffer: photos[0].buffer, mime: "image/jpeg" }])
    : await generateImage(prompt);
  return { buffer, prompt };
}
