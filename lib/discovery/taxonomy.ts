import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { SHOPEE_CATEGORIES } from "./shopee-categories";

/**
 * Categorias da Shopee no banco. Cada categoria de nível 1 vira um nicho (o que o site mostra
 * em /categoria/[slug]) com uma categoria de mesmo nome dentro. Idempotente e sem sobrescrever:
 * nicho ou categoria que já existem (mesmo slug/nome, criados à mão) são reaproveitados.
 */
export interface Taxonomy {
  nicheId: string;
  categoryId: string;
}

export async function ensureShopeeTaxonomy(): Promise<Map<string, Taxonomy>> {
  const result = new Map<string, Taxonomy>();
  const position = (await prisma.niche.aggregate({ _max: { position: true } }))._max.position ?? 0;

  for (const [index, item] of SHOPEE_CATEGORIES.entries()) {
    const slug = slugify(item.label);
    const niche =
      (await prisma.niche.findUnique({ where: { slug } })) ??
      (await prisma.niche.create({ data: { slug, name: item.label, position: position + index + 1 } }));

    let category = await prisma.category.findFirst({ where: { nicheId: niche.id, name: item.label } });
    if (!category) {
      let categorySlug = slug;
      for (let n = 2; await prisma.category.findUnique({ where: { slug: categorySlug } }); n++) categorySlug = `${slug}-${n}`;
      category = await prisma.category.create({ data: { slug: categorySlug, name: item.label, nicheId: niche.id } });
    }
    result.set(String(item.id), { nicheId: niche.id, categoryId: category.id });
  }
  return result;
}
