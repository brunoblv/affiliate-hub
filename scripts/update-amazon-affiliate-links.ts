/**
 * Atualiza os links de afiliado Amazon dos produtos ChartFM a partir do CSV.
 *
 * Uso:
 *   npx tsx scripts/update-amazon-affiliate-links.ts "C:\Users\blvbr\Downloads\chartfm_preenchido(2).csv"
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { parseCsv } from "../lib/csv";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error("Informe o caminho do CSV.");
  }

  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (key: string) => headers.indexOf(key);

  type CsvRow = { row: number; nome: string; asin: string; affiliateUrl: string };
  const csvRows: CsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (key: string) => {
      const n = idx(key);
      return n === -1 ? "" : (cells[n] ?? "").trim();
    };
    const plataforma = get("plataforma").toUpperCase();
    if (plataforma && plataforma !== "AMAZON") continue;
    const asin = get("id_anuncio");
    const affiliateUrl = get("url_afiliado");
    const nome = get("nome");
    if (!asin || !affiliateUrl) continue;
    csvRows.push({ row: i + 1, nome, asin, affiliateUrl });
  }

  const asinCounts = new Map<string, CsvRow[]>();
  for (const r of csvRows) {
    const list = asinCounts.get(r.asin) ?? [];
    list.push(r);
    asinCounts.set(r.asin, list);
  }

  console.log(`CSV: ${csvRows.length} linhas Amazon com url_afiliado (${asinCounts.size} ASINs únicos).`);

  const products = await prisma.product.findMany({
    where: { source: "AMAZON", project: { slug: "chartfm" } },
    select: {
      id: true,
      name: true,
      externalId: true,
      sources: { select: { id: true, affiliateUrl: true } },
      affiliateLinks: { select: { id: true, channel: true, affiliateUrl: true } },
    },
  });

  console.log(`Banco: ${products.length} produtos Amazon no projeto chartfm.`);

  const byAsin = new Map(products.map((p) => [p.externalId, p]));
  let updated = 0;
  let unchanged = 0;
  let missing = 0;
  let createdSources = 0;
  let updatedLinks = 0;

  function normalizeName(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  for (const [asin, group] of asinCounts) {
    const product = byAsin.get(asin);
    const chosen =
      product && group.length > 1
        ? (group.find((g) => normalizeName(g.nome) === normalizeName(product.name)) ?? group[group.length - 1])
        : group[group.length - 1];

    if (group.length > 1) {
      const urls = [...new Set(group.map((g) => g.affiliateUrl))];
      console.log(
        `[DUP] ASIN ${asin} aparece ${group.length}x no CSV (linhas ${group.map((g) => g.row).join(", ")}). Usando linha ${chosen.row}: ${chosen.affiliateUrl}` +
          (urls.length > 1 ? ` — URLs diferentes: ${urls.join(" | ")}` : ""),
      );
    }

    if (!product) {
      missing += 1;
      console.log(`[MISS] ${asin} — ${chosen.nome} — produto não encontrado no banco.`);
      continue;
    }

    const source = product.sources[0];
    const currentSourceUrl = source?.affiliateUrl ?? null;
    const linksNeedUpdate = product.affiliateLinks.filter((l) => l.affiliateUrl !== chosen.affiliateUrl);

    if (currentSourceUrl === chosen.affiliateUrl && linksNeedUpdate.length === 0) {
      unchanged += 1;
      continue;
    }

    if (source) {
      if (source.affiliateUrl !== chosen.affiliateUrl) {
        await prisma.productSource.update({
          where: { id: source.id },
          data: { affiliateUrl: chosen.affiliateUrl },
        });
      }
    } else {
      await prisma.productSource.create({
        data: {
          productId: product.id,
          platform: "AMAZON",
          externalId: asin,
          affiliateUrl: chosen.affiliateUrl,
        },
      });
      createdSources += 1;
    }

    for (const link of linksNeedUpdate) {
      await prisma.affiliateLink.update({
        where: { id: link.id },
        data: { affiliateUrl: chosen.affiliateUrl },
      });
      updatedLinks += 1;
    }

    updated += 1;
    console.log(
      `[OK] ${asin} — ${product.name}\n     ${currentSourceUrl ?? "(sem link)"} → ${chosen.affiliateUrl}` +
        (linksNeedUpdate.length ? ` (${linksNeedUpdate.length} AffiliateLink atualizado(s))` : ""),
    );
  }

  const csvAsins = new Set(asinCounts.keys());
  const extra = products.filter((p) => !csvAsins.has(p.externalId));
  if (extra.length) {
    console.log(`\n${extra.length} produto(s) Amazon no banco sem linha no CSV:`);
    for (const p of extra) {
      console.log(`  - ${p.externalId} — ${p.name}`);
    }
  }

  console.log("\nResumo:");
  console.log(`  atualizados: ${updated}`);
  console.log(`  inalterados: ${unchanged}`);
  console.log(`  não encontrados: ${missing}`);
  console.log(`  ProductSource criados: ${createdSources}`);
  console.log(`  AffiliateLink atualizados: ${updatedLinks}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
