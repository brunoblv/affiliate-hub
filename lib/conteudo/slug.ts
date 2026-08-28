import { prisma } from "@/lib/database";
import { slugify } from "@/lib/produtos";

/** Slug livre pra Post: tenta o slugify puro, senão vai numerando. */
export async function slugDePostLivre(base: string): Promise<string> {
  const limpo = slugify(base) || "post";
  const jaTem = await prisma.post.findUnique({ where: { slug: limpo }, select: { id: true } });
  if (!jaTem) return limpo;

  for (let n = 2; n < 50; n++) {
    const candidato = `${limpo}-${n}`;
    const ocupado = await prisma.post.findUnique({ where: { slug: candidato }, select: { id: true } });
    if (!ocupado) return candidato;
  }

  return `${limpo}-${Date.now().toString(36)}`;
}
