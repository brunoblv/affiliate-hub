"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { shopeeConnector } from "@/lib/connectors/shopee";
import { attachFetchedOffer, createDraftProduct } from "@/lib/admin/import-offer";
import { PAGE_SIZE } from "@/lib/discovery/shopee";
import { matchProductToMl } from "@/lib/discovery/ml-match";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

function go(back: string, param: "aviso" | "erro", message: string): never {
  const separator = back.includes("?") ? "&" : "?";
  redirect(`${back}${separator}${param}=${encodeURIComponent(message)}`);
}

/**
 * Importa os candidatos marcados como produtos em rascunho. O preço, o link de afiliado e a
 * foto são buscados de novo na API (nunca confiamos no que veio do formulário).
 */
export async function importCandidates(data: FormData) {
  await requireAdmin();
  // Só volta para a própria tela de candidatos (o campo vem do formulário).
  const rawBack = text(data, "voltar");
  const back = rawBack.startsWith("/admin/candidatos") ? rawBack : "/admin/candidatos";

  const keys = [...new Set(data.getAll("sel").map(String))].slice(0, PAGE_SIZE);
  if (keys.length === 0) go(back, "erro", "Marque pelo menos um produto para importar.");

  const store = await prisma.store.findFirst({ where: { connector: shopeeConnector.key, active: true } });
  if (!store) go(back, "erro", "Cadastre a loja Shopee em /admin/lojas escolhendo o conector Shopee.");
  if (!shopeeConnector.isConfigured()) go(back, "erro", "Shopee não está configurada no servidor.");

  const nicheIds = data.getAll("nicheIds").map(String).filter(Boolean);
  const categoryId = text(data, "categoryId") || null;

  let imported = 0;
  let already = 0;
  let failed = 0;
  let autoLinked = 0;
  let toReview = 0;

  for (const key of keys) {
    const [shopId, itemId] = key.split(":");
    if (!/^\d+$/.test(shopId ?? "") || !/^\d+$/.test(itemId ?? "")) {
      failed++;
      continue;
    }

    const exists = await prisma.offer.findFirst({ where: { storeId: store.id, externalListingId: itemId } });
    if (exists) {
      already++;
      continue;
    }

    try {
      const result = await shopeeConnector.fetchOffer({ externalListingId: itemId, externalSellerId: shopId, originalUrl: null });
      if (result.kind !== "ok" || !result.title) {
        failed++;
        continue;
      }
      const product = await createDraftProduct({ name: result.title, nicheIds, categoryId });
      await attachFetchedOffer({
        productId: product.id,
        variantId: product.variants[0].id,
        store,
        listingId: itemId,
        sellerId: shopId,
        originalUrl: `https://shopee.com.br/product/${shopId}/${itemId}`,
        result,
      });
      imported++;
      // Procura o mesmo produto no Mercado Livre; falha aqui não desfaz a importação.
      const outcome = await matchProductToMl(product.id).catch(() => "skipped" as const);
      if (outcome === "auto") autoLinked++;
      else if (outcome === "pending") toReview++;
    } catch {
      failed++;
    }
    // Respeita o intervalo mínimo do conector entre consultas.
    await new Promise((resolve) => setTimeout(resolve, shopeeConnector.limits.minIntervalMs));
  }

  revalidatePath("/admin/produtos");
  const parts = [`${imported} ${imported === 1 ? "produto importado" : "produtos importados"} como rascunho`];
  if (autoLinked) parts.push(`${autoLinked} vinculados ao Mercado Livre`);
  if (toReview) parts.push(`${toReview} com correspondência para escolher em Correspondências`);
  if (already) parts.push(`${already} já cadastrados`);
  if (failed) parts.push(`${failed} não puderam ser importados`);
  go(back, "aviso", `${parts.join(" · ")}.`);
}
