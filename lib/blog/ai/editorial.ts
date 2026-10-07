import { prisma } from "@/lib/db";
import { generateJson, modelChain } from "@/lib/gemini";
import type { EditorialCategory } from "@/lib/generated/prisma/enums";
import { slugify } from "@/lib/slug";
import { wordCount } from "@/lib/blog/body";
import { CATEGORIES } from "@/lib/blog/categories";
import { fill, journeyContext, loadPrompt } from "./prompts";

/**
 * Artigos editoriais com IA: sugestão de tema, artigo completo e bloco de opinião.
 * Os prompts (content/blogs/<sub>/prompts) exigem um bloco de opinião/vivência própria
 * em todo artigo: é o que evita texto genérico. Ajuste a exigência lá, não aqui.
 */

type BlogRef = { id: string; subdomain: string };

export interface Theme {
  titulo: string;
  resumoPauta: string;
  palavraChave: string;
}

export interface Article {
  titulo: string;
  resumo: string;
  corpo: string;
  seoTitulo: string;
  metaDescricao: string;
}

const THEMES_SCHEMA = {
  type: "OBJECT",
  properties: {
    temas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { titulo: { type: "STRING" }, resumoPauta: { type: "STRING" }, palavraChave: { type: "STRING" } },
        required: ["titulo", "resumoPauta", "palavraChave"],
      },
    },
  },
  required: ["temas"],
};

const ARTICLE_SCHEMA = {
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

const MIN_WORDS = 600;
const TARGET_WORDS = 850;
const MAX_ARTICLE_ATTEMPTS = 3;

export function isTheme(value: unknown): value is Theme {
  if (!value || typeof value !== "object") return false;
  const theme = value as Record<string, unknown>;
  return typeof theme.titulo === "string" && typeof theme.resumoPauta === "string" && typeof theme.palavraChave === "string";
}

/** Temas novos para a categoria, sem repetir títulos que o blog já tem nela. */
export async function suggestThemes(blog: BlogRef, category: EditorialCategory, count: number): Promise<Theme[]> {
  const existing = await prisma.post.findMany({
    where: { blogId: blog.id, kind: "EDITORIAL", category },
    select: { title: true, slug: true },
    orderBy: { createdAt: "desc" },
  });
  const existingSlugs = new Set(existing.map((post) => slugify(post.title)));
  const list = existing.length
    ? existing.map((post) => `- ${post.title}`).join("\n")
    : "(nenhum artigo publicado ainda nessa categoria — pode propor qualquer tema dentro da linha editorial)";

  const base = fill(await loadPrompt(blog.subdomain, CATEGORIES[category].briefPrompt), {
    contextoJornada: await journeyContext(blog.id, category),
  });
  // Pede folga: parte pode colidir com títulos existentes depois do slugify.
  const prompt = `${base}\n\n## Títulos já existentes no site (nessa categoria)\n\n${list}\n\n## Pedido\n\nGere ${count + 2} temas novos (peço uma folga porque alguns podem ser descartados por semelhança com os já existentes).`;

  const { data } = await generateJson<{ temas: Theme[] }>({
    prompt,
    schema: THEMES_SCHEMA,
    temperature: 1,
    maxOutputTokens: 2048,
    timeoutMs: 20_000,
    maxAttempts: 2,
    models: modelChain("short").slice(0, 3),
  });

  const seen = new Set<string>();
  const chosen: Theme[] = [];
  for (const theme of data.temas) {
    const slug = slugify(theme.titulo ?? "");
    if (!slug || existingSlugs.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    chosen.push(theme);
    if (chosen.length >= count) break;
  }
  return chosen;
}

async function articlePrompt(blog: BlogRef, theme: Theme, category: EditorialCategory, shortDraft?: Article): Promise<string> {
  const filled = fill(await loadPrompt(blog.subdomain, CATEGORIES[category].articlePrompt), {
    titulo: theme.titulo,
    resumoPauta: theme.resumoPauta,
    palavraChave: theme.palavraChave,
    contextoJornada: await journeyContext(blog.id, category),
  });
  if (!shortDraft) return filled;

  return `${filled}

## Atenção — expandir o rascunho abaixo

A tentativa anterior ficou com ${wordCount(shortDraft.corpo)} palavras. O piso é ${MIN_WORDS}; o alvo é ${TARGET_WORDS}. Não recomece do zero: mantenha o ângulo, os fatos e a voz, e desenvolva cada seção com mais detalhe concreto (rotina, critérios, o que observar, trade-offs, o que faria diferente). Se o tema comportar, acrescente 1 seção nova. Não invente fato pessoal fora do contexto e não repita frases pra encher.

### Rascunho anterior (corpo)

${shortDraft.corpo}`;
}

/** Artigo completo; se sair curto, pede para expandir o próprio rascunho. */
export async function writeArticle(blog: BlogRef, theme: Theme, category: EditorialCategory): Promise<Article> {
  const counts: number[] = [];
  let shortDraft: Article | undefined;

  for (let attempt = 1; attempt <= MAX_ARTICLE_ATTEMPTS; attempt++) {
    const { data } = await generateJson<Article>({
      prompt: await articlePrompt(blog, theme, category, shortDraft),
      schema: ARTICLE_SCHEMA,
      temperature: 0.9,
      maxOutputTokens: 16384,
      timeoutMs: 45_000,
      models: modelChain("article"),
    });
    const words = wordCount(data.corpo);
    counts.push(words);
    if (words >= MIN_WORDS) return data;
    shortDraft = data;
  }

  throw new Error(
    `A IA não chegou a ${MIN_WORDS} palavras para "${theme.titulo}" em ${MAX_ARTICLE_ATTEMPTS} tentativas (ficou com ${counts.join(", ")}).`,
  );
}

/** Insere 1-2 parágrafos de opinião/vivência num artigo existente, preservando o resto. */
export async function addOpinion(
  blog: BlogRef,
  post: { title: string; summary: string | null; body: string; category: EditorialCategory | null },
): Promise<string> {
  const category = post.category ?? "HOME_TIPS";
  const prompt = fill(await loadPrompt(blog.subdomain, CATEGORIES[category].opinionPrompt), {
    titulo: post.title,
    resumo: post.summary ?? "(sem resumo)",
    corpoAtual: post.body,
    contextoJornada: await journeyContext(blog.id, category),
  });
  const { data } = await generateJson<{ corpoRevisado: string }>({
    prompt,
    schema: { type: "OBJECT", properties: { corpoRevisado: { type: "STRING" } }, required: ["corpoRevisado"] },
    temperature: 0.8,
    maxOutputTokens: 16384,
    timeoutMs: 45_000,
    models: modelChain("article"),
  });
  if (wordCount(data.corpoRevisado) < wordCount(post.body) * 0.8) {
    throw new Error("A revisão veio bem mais curta que o original; nada foi alterado.");
  }
  return data.corpoRevisado;
}
