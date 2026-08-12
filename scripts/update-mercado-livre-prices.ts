/**
 * Atualiza o preço dos produtos Mercado Livre (source = MERCADO_LIVRE, status ACTIVE)
 * e grava um snapshot em ProductPriceHistory sempre que o preço mudar.
 *
 * `/items/{id}` (API de Itens) retorna 403 para anúncios que não pertencem à
 * conta autenticada — só dá acesso pleno aos próprios anúncios do usuário
 * conectado. Como produtos de afiliados são de terceiros, usamos a API de
 * Catálogo (`/products/{catalogProductId}/items`), que lista os anúncios (com
 * preço) de um produto de catálogo sem essa restrição. O catalogProductId é
 * extraído da productUrl salva (padrão .../p/MLB...).
 *
 * Uso (na pasta Sistema-afiliados):
 *   npx tsx scripts/update-mercado-livre-prices.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/database";
import { mercadoLivreClient } from "@/lib/mercado-livre/client";
import { logger } from "@/lib/logging";

function extractCatalogProductId(productUrl: string | null): string | null {
  return productUrl?.match(/\/p\/(MLB\d+)/)?.[1] ?? null;
}

async function main() {
  await mercadoLivreClient.authenticate();

  const products = await prisma.product.findMany({
    where: { source: "MERCADO_LIVRE", status: "ACTIVE" },
    select: { id: true, externalId: true, name: true, price: true, originalPrice: true, productUrl: true },
  });

  console.log(`${products.length} produtos Mercado Livre ativos encontrados.`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const catalogProductId = extractCatalogProductId(product.productUrl);
      if (!catalogProductId) {
        console.log(`[SKIP] ${product.externalId} — productUrl sem catalogProductId (${product.productUrl}).`);
        continue;
      }

      const fresh = await mercadoLivreClient.getItemPriceViaCatalog(catalogProductId, product.externalId);

      if (!fresh) {
        console.log(`[SKIP] ${product.externalId} — anúncio não encontrado no catálogo ${catalogProductId} (removido/pausado?).`);
        continue;
      }

      const currentPrice = Number(product.price);
      const currentOriginalPrice = product.originalPrice === null ? null : Number(product.originalPrice);
      const newOriginalPrice = fresh.originalPrice ?? null;

      if (fresh.price === currentPrice && newOriginalPrice === currentOriginalPrice) {
        unchanged++;
        continue;
      }

      await prisma.$transaction([
        prisma.product.update({
          where: { id: product.id },
          data: { price: fresh.price, originalPrice: newOriginalPrice },
        }),
        prisma.productPriceHistory.create({
          data: { productId: product.id, price: fresh.price },
        }),
      ]);

      console.log(`[UPDATE] ${product.name}: R$${currentPrice} -> R$${fresh.price}`);
      updated++;
    } catch (error) {
      failed++;
      console.error(`[ERRO] ${product.externalId} (${product.name}):`, error instanceof Error ? error.message : error);
      logger.error("PRODUCT_SYNC", "Mercado Livre: falha ao atualizar preço", {
        productId: product.id,
        externalId: product.externalId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`\nResumo: ${updated} atualizados, ${unchanged} sem mudança, ${failed} com erro.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
