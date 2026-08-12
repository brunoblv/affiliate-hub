/**
 * Atualiza preço, nome e imagem dos produtos Mercado Livre (source = MERCADO_LIVRE,
 * status ACTIVE) e grava um snapshot em ProductPriceHistory sempre que o preço mudar.
 *
 * `/items/{id}` (API de Itens) retorna 403 para anúncios que não pertencem à
 * conta autenticada — só dá acesso pleno aos próprios anúncios do usuário
 * conectado. Como produtos de afiliados são de terceiros, usamos a API de
 * Catálogo: `/products/{catalogProductId}` (nome + imagem) e
 * `/products/{catalogProductId}/items` (preço do anúncio), sem essa
 * restrição. O catalogProductId é extraído da productUrl salva (padrão
 * .../p/MLB...).
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
    select: { id: true, externalId: true, name: true, price: true, originalPrice: true, productUrl: true, imageUrl: true },
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

      const [freshPrice, freshInfo] = await Promise.all([
        mercadoLivreClient.getItemPriceViaCatalog(catalogProductId, product.externalId),
        mercadoLivreClient.getCatalogProductInfo(catalogProductId),
      ]);

      if (!freshPrice) {
        console.log(`[SKIP] ${product.externalId} — anúncio não encontrado no catálogo ${catalogProductId} (removido/pausado?).`);
        continue;
      }

      const currentPrice = Number(product.price);
      const currentOriginalPrice = product.originalPrice === null ? null : Number(product.originalPrice);
      const newOriginalPrice = freshPrice.originalPrice ?? null;

      const priceChanged = freshPrice.price !== currentPrice || newOriginalPrice !== currentOriginalPrice;
      const nameChanged = Boolean(freshInfo?.name) && freshInfo!.name !== product.name;
      const imageChanged = Boolean(freshInfo?.imageUrl) && freshInfo!.imageUrl !== product.imageUrl;

      if (!priceChanged && !nameChanged && !imageChanged) {
        unchanged++;
        continue;
      }

      const updateData: { price?: number; originalPrice?: number | null; name?: string; imageUrl?: string } = {};
      if (priceChanged) {
        updateData.price = freshPrice.price;
        updateData.originalPrice = newOriginalPrice;
      }
      if (nameChanged) updateData.name = freshInfo!.name;
      if (imageChanged) updateData.imageUrl = freshInfo!.imageUrl;

      await prisma.$transaction([
        prisma.product.update({ where: { id: product.id }, data: updateData }),
        ...(priceChanged ? [prisma.productPriceHistory.create({ data: { productId: product.id, price: freshPrice.price } })] : []),
      ]);

      const changes = [
        priceChanged && `preço R$${currentPrice} -> R$${freshPrice.price}`,
        nameChanged && "nome",
        imageChanged && "imagem",
      ]
        .filter(Boolean)
        .join(", ");
      console.log(`[UPDATE] ${product.name}: ${changes}`);
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
