/**
 * Procura correspondências no Mercado Livre para os produtos que ainda não foram procurados.
 *
 *   npx tsx scripts/match-ml.ts [--limit 200]
 *
 * Marca e modelo iguais viram oferta sozinha; o resto vai para /admin/correspondencias.
 * Produtos já processados (mlMatchCheckedAt) são ignorados, então pode rodar de novo à vontade.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { matchProductToMl } from "@/lib/discovery/ml-match";

async function main() {
  const limitIndex = process.argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : 200;

  const products = await prisma.product.findMany({
    where: { mlMatchCheckedAt: null, variants: { some: { offers: { some: {} } } } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, name: true },
  });
  console.log(`${products.length} produto(s) para procurar no Mercado Livre.`);

  const totals = { auto: 0, pending: 0, none: 0, skipped: 0, failed: 0 };
  let done = 0;
  for (const product of products) {
    try {
      totals[await matchProductToMl(product.id)]++;
    } catch (error) {
      totals.failed++;
      console.warn(`  falha em "${product.name.slice(0, 40)}": ${error instanceof Error ? error.message : error}`);
    }
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${products.length} · ${JSON.stringify(totals)}`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  console.log(`Concluído: ${totals.auto} vinculados sozinhos, ${totals.pending} para revisar, ${totals.none} sem correspondência, ${totals.skipped} ignorados, ${totals.failed} falhas.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
