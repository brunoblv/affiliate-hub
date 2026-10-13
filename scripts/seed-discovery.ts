/**
 * Semeia o que a descoberta precisa para começar: marcas, termos bloqueados e pautas padrão
 * (25 Shopee + 25 AliExpress por dia). Idempotente: não sobrescreve o que já foi editado.
 *   npx tsx scripts/seed-discovery.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { BRAND_SEEDS, slugOfBrand } from "@/lib/discovery/brands-seed";
import { DEFAULT_BLOCKED_TERMS } from "@/lib/discovery/gates";
import { SHOPEE_CATEGORIES } from "@/lib/discovery/shopee-categories";
import { ensureShopeeTaxonomy } from "@/lib/discovery/taxonomy";

async function main() {
  let brands = 0;
  for (const seed of BRAND_SEEDS) {
    const slug = slugOfBrand(seed.name);
    const exists = await prisma.brand.findUnique({ where: { slug } });
    if (exists) continue;
    await prisma.brand.create({ data: { slug, name: seed.name, aliases: seed.aliases ?? [], weight: seed.weight } });
    brands++;
  }

  let terms = 0;
  for (const term of DEFAULT_BLOCKED_TERMS) {
    await prisma.blockedTerm.upsert({ where: { term }, create: { term }, update: {} });
    terms++;
  }

  let queries = 0;
  if ((await prisma.discoveryQuery.count()) === 0) {
    await prisma.discoveryQuery.createMany({
      data: [
        { source: "SHOPEE_API", kind: "hot", sort: "sales", pages: 3, quota: 25, position: 0 },
        { source: "ALIEXPRESS_API", kind: "hot", sort: "sales", pages: 3, quota: 25, position: 0 },
      ],
    });
    queries = 2;
  }
  // Uma pauta por categoria da Shopee: os produtos importados já nascem no nicho/categoria certos.
  const taxonomy = await ensureShopeeTaxonomy();
  let categoryQueries = 0;
  for (const [index, item] of SHOPEE_CATEGORIES.entries()) {
    const exists = await prisma.discoveryQuery.findFirst({ where: { source: "SHOPEE_API", kind: "category", value: String(item.id) } });
    if (exists) continue;
    const target = taxonomy.get(String(item.id))!;
    await prisma.discoveryQuery.create({
      data: { source: "SHOPEE_API", kind: "category", value: String(item.id), sort: "sales", pages: 2, nicheId: target.nicheId, categoryId: target.categoryId, position: index + 1 },
    });
    categoryQueries++;
  }
  console.log(`Pautas por categoria da Shopee: ${categoryQueries}`);
  console.log(`Marcas novas: ${brands} · termos bloqueados: ${terms} · pautas criadas: ${queries}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
