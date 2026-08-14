"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/database";
import { Platform, type Prisma } from "@/lib/generated/prisma/client";
import { mercadoLivreClient } from "@/lib/mercado-livre/client";
import { runScoringPipeline } from "@/lib/scoring";
import { attachAffiliateLinkAndPublish } from "@/lib/affiliate/attach-link";
import { logger } from "@/lib/logging";

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractCatalogProductId(input: string): string | null {
  const fromUrl = input.match(/\/p\/(MLB\d+)/i)?.[1];
  if (fromUrl) return fromUrl.toUpperCase();

  const bareCode = input.trim().match(/^(MLB\d+)$/i)?.[1];
  return bareCode ? bareCode.toUpperCase() : null;
}

export interface MlImportRowError {
  row: number;
  message: string;
}

export interface MlImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  ignored: number;
  linksAttached: number;
  errors: MlImportRowError[];
}

/**
 * Importação em massa de produtos do Mercado Livre por código/URL — busca
 * nome, imagem, marca e preço via API de Catálogo (`/products/{id}` e
 * `/products/{id}/items`), a mesma rota usada por scripts/update-mercado-livre-prices.ts
 * porque `/items/{id}` retorna 403 para anúncios de terceiros.
 */
export async function importMercadoLivreProductsAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Projeto é obrigatório.");

  const categoryId = String(formData.get("categoryId") ?? "") || undefined;

  const raw = String(formData.get("entries") ?? "");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Cole ao menos um produto (URL ou código do Mercado Livre).");
  }

  const job = await prisma.job.create({
    data: { queue: "product-import-mercado-livre", name: "Importação Mercado Livre (por código)", status: "RUNNING", startedAt: new Date() },
  });

  const summary: MlImportSummary = {
    totalRows: lines.length,
    created: 0,
    updated: 0,
    ignored: 0,
    linksAttached: 0,
    errors: [],
  };

  try {
    await mercadoLivreClient.authenticate();

    for (let i = 0; i < lines.length; i++) {
      const rowNumber = i + 1;
      const line = lines[i];

      const fields = line
        .split(/\t|;/)
        .map((part) => part.trim())
        .filter(Boolean);

      // Aceita tanto o formato de 2 colunas (código/URL;link afiliado) quanto
      // uma tabela colada com 3 colunas (ID, Link cru, Link afiliado, ex.:
      // export do Portal de Afiliados) — identifica cada coluna pelo
      // conteúdo em vez de assumir a posição fixa, senão o link cru do
      // Mercado Livre (coluna do meio) acaba sendo salvo como se fosse o
      // link de afiliado.
      const codeOrUrl = fields.find((field) => extractCatalogProductId(field)) ?? fields[0] ?? "";
      const affiliateUrl = [...fields]
        .reverse()
        .find((field) => field.startsWith("http") && field !== codeOrUrl && !extractCatalogProductId(field));

      const catalogProductId = extractCatalogProductId(codeOrUrl);
      if (!catalogProductId) {
        summary.ignored += 1;
        summary.errors.push({
          row: rowNumber,
          message: `Não encontrei um código de catálogo (MLB...) em "${codeOrUrl}". Cole o link completo da página do produto (com "/p/MLB...") ou o código MLB do catálogo.`,
        });
        continue;
      }

      try {
        const [info, items] = await Promise.all([
          mercadoLivreClient.getCatalogProductInfo(catalogProductId),
          mercadoLivreClient.listCatalogItems(catalogProductId),
        ]);

        if (!info) {
          summary.ignored += 1;
          summary.errors.push({ row: rowNumber, message: `Produto de catálogo ${catalogProductId} não encontrado na API.` });
          continue;
        }

        if (items.length === 0) {
          summary.ignored += 1;
          summary.errors.push({ row: rowNumber, message: `Nenhum anúncio ativo encontrado para o catálogo ${catalogProductId}.` });
          continue;
        }

        const cheapest = items.reduce((min, item) => (item.price < min.price ? item : min), items[0]);

        const existing = await prisma.product.findUnique({
          where: { source_externalId: { source: Platform.MERCADO_LIVRE, externalId: cheapest.itemId } },
          select: { id: true },
        });

        // Sempre gerado: o Prisma valida a forma do bloco `create` do upsert mesmo
        // quando a linha já existe e só o `update` é de fato aplicado.
        const slug = `${Platform.MERCADO_LIVRE.toLowerCase()}-${toSlug(cheapest.itemId)}`;
        const discountPercent =
          cheapest.originalPrice && cheapest.originalPrice > cheapest.price
            ? Math.round(((cheapest.originalPrice - cheapest.price) / cheapest.originalPrice) * 100)
            : undefined;
        const productUrl = codeOrUrl.startsWith("http") ? codeOrUrl : `https://www.mercadolivre.com.br/p/${catalogProductId}`;

        const product = await prisma.product.upsert({
          where: { source_externalId: { source: Platform.MERCADO_LIVRE, externalId: cheapest.itemId } },
          create: {
            projectId,
            source: Platform.MERCADO_LIVRE,
            externalId: cheapest.itemId,
            name: info.name,
            slug,
            description: info.description,
            brand: info.brand,
            categoryId,
            imageUrl: info.imageUrl,
            productUrl,
            price: cheapest.price,
            originalPrice: cheapest.originalPrice,
            discountPercent,
          },
          update: {
            name: info.name,
            description: info.description,
            brand: info.brand,
            categoryId,
            imageUrl: info.imageUrl,
            productUrl,
            price: cheapest.price,
            originalPrice: cheapest.originalPrice,
            discountPercent,
          },
        });

        await runScoringPipeline(product.id, { isNew: !existing });

        if (existing) summary.updated += 1;
        else summary.created += 1;

        if (affiliateUrl) {
          try {
            await attachAffiliateLinkAndPublish({ productId: product.id, affiliateUrl });
            summary.linksAttached += 1;
          } catch (error) {
            summary.errors.push({
              row: rowNumber,
              message: `Produto salvo, mas falha ao cadastrar link de afiliado: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
      } catch (error) {
        summary.ignored += 1;
        summary.errors.push({ row: rowNumber, message: error instanceof Error ? error.message : String(error) });
      }
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED", finishedAt: new Date(), result: summary as unknown as Prisma.InputJsonValue },
    });

    logger.info("PRODUCT_SYNC", "Importação Mercado Livre por código concluída", summary);
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }

  redirect(`/admin/products/import-mercado-livre?jobId=${job.id}`);
}
