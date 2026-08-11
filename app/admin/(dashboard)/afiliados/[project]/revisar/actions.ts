"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { runScoringPipeline } from "@/lib/scoring";
import { EntityStatus } from "@/lib/generated/prisma/client";

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || value === "") return undefined;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function updateScrapedProductAction(projectSlug: string, productId: string, formData: FormData) {
  const project = await getProjectBySlug(projectSlug);
  const product = await prisma.product.findFirst({ where: { id: productId, projectId: project.id } });
  if (!product) throw new Error("Produto não encontrado neste projeto.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const price = parseNumber(formData.get("price"));
  if (price === undefined) throw new Error("Preço é obrigatório.");

  const originalPrice = parseNumber(formData.get("originalPrice"));
  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100 * 100) / 100
      : undefined;

  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const activate = formData.get("activate") === "on" || formData.get("activate") === "true";

  await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      brand: String(formData.get("brand") ?? "").trim() || null,
      categoryId,
      imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
      productUrl: String(formData.get("productUrl") ?? "").trim() || null,
      price,
      originalPrice: originalPrice ?? null,
      discountPercent: discountPercent ?? null,
      status: activate ? EntityStatus.ACTIVE : product.status,
    },
  });

  const affiliateUrl = String(formData.get("affiliateUrl") ?? "").trim();
  if (affiliateUrl) {
    const source = await prisma.productSource.findFirst({ where: { productId } });
    if (source) {
      await prisma.productSource.update({ where: { id: source.id }, data: { affiliateUrl } });
    }
  }

  await runScoringPipeline(productId);

  revalidatePath(`/admin/afiliados/${projectSlug}/revisar`);
  revalidatePath(`/admin/afiliados/${projectSlug}/produtos`);
  revalidatePath(`/admin/products/${productId}`);
}

export async function activateScrapedProductAction(projectSlug: string, productId: string) {
  const project = await getProjectBySlug(projectSlug);
  const product = await prisma.product.findFirst({ where: { id: productId, projectId: project.id } });
  if (!product) throw new Error("Produto não encontrado neste projeto.");

  await prisma.product.update({
    where: { id: productId },
    data: { status: EntityStatus.ACTIVE },
  });

  revalidatePath(`/admin/afiliados/${projectSlug}/revisar`);
  revalidatePath(`/admin/afiliados/${projectSlug}/produtos`);
}
