/**
 * Primeira carga do catálogo a partir do Datafeed da Shopee.
 *
 *   npx tsx scripts/import-feed.ts --files feed1.csv feed2.csv --limit 1000 --per-category 150 [--dry-run]
 *
 * Lê os CSVs, pontua e escolhe os melhores (com teto por categoria); então, para cada um, busca
 * o preço e o link de afiliado REAL na API (o link do feed não tem o código de afiliado) e cria o
 * produto em rascunho com a oferta. Produto que a API não devolve (fora da vitrine de afiliados)
 * é pulado. Pode ser interrompido e rodado de novo: quem já tem oferta é ignorado.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { shopeeConnector } from "@/lib/connectors/shopee";
import { attachFetchedOffer, createDraftProduct } from "@/lib/admin/import-offer";
import { readCsv, scoreFeedRow, selectDiverse, type FeedCandidate } from "@/lib/discovery/feed";

/** Categoria de nível 1 da Shopee -> nicho do site (slug + nome). */
const NICHES: Record<string, { slug: string; name: string }> = {
  "Home & Living": { slug: "casa-e-decoracao", name: "Casa e decoração" },
  "Home Appliances": { slug: "eletrodomesticos", name: "Eletrodomésticos" },
  "Mobile & Gadgets": { slug: "celular", name: "Celular" },
  Audio: { slug: "audio", name: "Áudio" },
  "Computers & Accessories": { slug: "computadores", name: "Computadores e acessórios" },
  "Cameras & Drones": { slug: "cameras-e-drones", name: "Câmeras e drones" },
  Beauty: { slug: "beleza", name: "Beleza" },
  Health: { slug: "saude", name: "Saúde" },
  "Sports & Outdoors": { slug: "esportes", name: "Esportes e ar livre" },
  "Mom & Baby": { slug: "mae-e-bebe", name: "Mãe e bebê" },
  "Baby & Kids Fashion": { slug: "moda-infantil", name: "Moda infantil" },
  Pets: { slug: "pets", name: "Pets" },
  Stationery: { slug: "papelaria", name: "Papelaria" },
  "Hobbies & Collections": { slug: "hobbies", name: "Hobbies e coleções" },
  "Books & Magazines": { slug: "livros", name: "Livros e revistas" },
  "Food & Beverages": { slug: "alimentos", name: "Alimentos e bebidas" },
  "Fashion Accessories": { slug: "acessorios", name: "Acessórios de moda" },
  Watches: { slug: "relogios", name: "Relógios" },
  "Women Clothes": { slug: "moda-feminina", name: "Moda feminina" },
  "Men Clothes": { slug: "moda-masculina", name: "Moda masculina" },
  "Women Shoes": { slug: "calcados-femininos", name: "Calçados femininos" },
  "Men Shoes": { slug: "calcados-masculinos", name: "Calçados masculinos" },
  "Women Bags": { slug: "bolsas-femininas", name: "Bolsas femininas" },
  "Men Bags": { slug: "bolsas-masculinas", name: "Bolsas masculinas" },
  "Spare Parts and Accessories for Vehicles": { slug: "veiculos", name: "Peças e acessórios para veículos" },
  "Gaming & Consoles": { slug: "games", name: "Games e consoles" },
  "Toys & Hobbies": { slug: "brinquedos", name: "Brinquedos e hobbies" },
};

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function files(): string[] {
  const index = process.argv.indexOf("--files");
  if (index < 0) return [];
  const list: string[] = [];
  for (const value of process.argv.slice(index + 1)) {
    if (value.startsWith("--")) break;
    list.push(value);
  }
  return list;
}

async function main() {
  const paths = files();
  const limit = Number(arg("limit") ?? 1000);
  const perCategory = Number(arg("per-category") ?? 150);
  const dryRun = process.argv.includes("--dry-run");
  if (paths.length === 0) throw new Error("Informe --files <feed.csv> [...]");

  console.log(`Lendo ${paths.length} feed(s)…`);
  const byItem = new Map<string, FeedCandidate>();
  let rows = 0;
  for (const path of paths) {
    for await (const row of readCsv(path)) {
      rows++;
      const candidate = scoreFeedRow(row);
      if (candidate && !byItem.has(candidate.itemId)) byItem.set(candidate.itemId, candidate);
    }
  }
  console.log(`${rows} linhas lidas, ${byItem.size} passaram nos filtros de qualidade.`);

  // Reserva para os que a API não devolver (fora da vitrine de afiliados).
  const ranked = selectDiverse([...byItem.values()], { total: Math.ceil(limit * 2.5), perCategory: perCategory * 2 });
  const stats = new Map<string, number>();
  for (const c of ranked.slice(0, limit)) stats.set(c.category1, (stats.get(c.category1) ?? 0) + 1);
  console.log("Distribuição da seleção (primeiros", limit, "):");
  for (const [category, count] of [...stats.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${count}\t${category}`);
  if (dryRun) {
    for (const c of ranked.slice(0, 8)) console.log(`  ${c.score}\t${c.category1}\t${c.title.slice(0, 70)}`);
    return;
  }

  const store = await prisma.store.findFirst({ where: { connector: shopeeConnector.key, active: true } });
  if (!store) throw new Error("Cadastre a loja Shopee com o conector Shopee em /admin/lojas.");
  if (!shopeeConnector.isConfigured()) throw new Error("SHOPEE_APP_ID/SHOPEE_SECRET não configurados.");

  const nicheIds = new Map<string, string>();
  const nicheFor = async (category: string): Promise<string[]> => {
    const def = NICHES[category];
    if (!def) return [];
    let id = nicheIds.get(def.slug);
    if (!id) {
      const niche = await prisma.niche.upsert({ where: { slug: def.slug }, update: {}, create: { slug: def.slug, name: def.name } });
      id = niche.id;
      nicheIds.set(def.slug, id);
    }
    return [id];
  };

  let imported = 0;
  let skippedExisting = 0;
  let notAvailable = 0;
  let failed = 0;

  for (const candidate of ranked) {
    if (imported >= limit) break;
    if (await prisma.offer.findFirst({ where: { storeId: store.id, externalListingId: candidate.itemId }, select: { id: true } })) {
      skippedExisting++;
      continue;
    }
    try {
      const result = await shopeeConnector.fetchOffer({
        externalListingId: candidate.itemId,
        externalSellerId: candidate.shopId,
        originalUrl: null,
      });
      // Sem link de afiliado real, não entra (regra: nunca divulgar link sem comissão).
      if (result.kind !== "ok" || !result.title || !result.affiliateUrl) {
        notAvailable++;
      } else {
        const product = await createDraftProduct({ name: result.title, nicheIds: await nicheFor(candidate.category1), categoryId: null });
        await attachFetchedOffer({
          productId: product.id,
          variantId: product.variants[0].id,
          store,
          listingId: candidate.itemId,
          sellerId: candidate.shopId,
          originalUrl: `https://shopee.com.br/product/${candidate.shopId}/${candidate.itemId}`,
          result,
        });
        imported++;
      }
    } catch (error) {
      failed++;
      console.warn(`  falha em ${candidate.itemId}: ${error instanceof Error ? error.message : error}`);
    }
    const done = imported + notAvailable + failed + skippedExisting;
    if (done % 25 === 0) {
      console.log(`  ${imported}/${limit} importados · ${notAvailable} fora da vitrine · ${failed} falhas · ${skippedExisting} já cadastrados`);
    }
    await new Promise((resolve) => setTimeout(resolve, shopeeConnector.limits.minIntervalMs));
  }

  console.log(`Concluído: ${imported} importados, ${notAvailable} fora da vitrine, ${failed} falhas, ${skippedExisting} já cadastrados.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
