import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import type { EditorialCategory } from "@/lib/generated/prisma/enums";
import { CATEGORIES } from "@/lib/blog/categories";

/**
 * Prompts e dados de cada blog ficam em content/blogs/<subdomain>/ (versionados, sem
 * segredo): a voz do Meu Novo Lar não serve para outro blog. Cache em memória por
 * processo; editar um prompt pede reiniciar o servidor em produção.
 */
const cache = new Map<string, string>();

export function blogContentPath(subdomain: string, ...parts: string[]): string {
  if (!/^[a-z0-9-]+$/.test(subdomain)) throw new Error("Subdomínio inválido.");
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "content", "blogs", subdomain, ...parts);
}

export async function loadBlogFile(subdomain: string, ...parts: string[]): Promise<string> {
  const file = blogContentPath(subdomain, ...parts);
  const cached = cache.get(file);
  if (cached !== undefined) return cached;
  try {
    const content = await readFile(file, "utf-8");
    cache.set(file, content);
    return content;
  } catch {
    throw new Error(`O blog "${subdomain}" não tem o arquivo content/blogs/${subdomain}/${parts.join("/")}.`);
  }
}

export const loadPrompt = (subdomain: string, file: string) => loadBlogFile(subdomain, "prompts", file);

export async function loadBlogJson<T>(subdomain: string, file: string): Promise<T> {
  return JSON.parse(await loadBlogFile(subdomain, file)) as T;
}

/** Preenche {{chave}} (todas as ocorrências). Chave sem valor fica como está. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

const NO_NOTES =
  "(nenhum registro pessoal cadastrado ainda em /admin/blog/jornada — escreva de forma mais genérica, sem inventar nenhum detalhe pessoal específico)";

/**
 * Contexto real da jornada pessoal (notas livres do admin) para as categorias de
 * "jornada": a IA usa fatos reais em vez de inventar. Notas sem categoria contam para
 * todas as categorias de jornada do blog.
 */
export async function journeyContext(blogId: string, category: EditorialCategory): Promise<string> {
  if (!CATEGORIES[category].usesJourneyNotes) return "";
  const notes = await prisma.journeyNote.findMany({
    where: { blogId, OR: [{ category }, { category: null }] },
    orderBy: { createdAt: "asc" },
    select: { text: true },
  });
  if (notes.length === 0) return NO_NOTES;
  return notes.map((note, index) => `### Registro ${index + 1}\n${note.text}`).join("\n\n");
}
