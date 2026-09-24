"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";
import { generateCreatives } from "@/lib/creatives/generate";
import { invalidateOutdatedCreatives } from "@/lib/creatives/invalidate";
import { deleteCreativeFile } from "@/lib/creatives/storage";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const back = (productId: string) => `/admin/produtos/${productId}?aba=criativos`;
function fail(productId: string, message: string): never {
  redirect(`${back(productId)}&erro=${encodeURIComponent(message)}`);
}
function done(productId: string, message: string): never {
  redirect(`${back(productId)}&aviso=${encodeURIComponent(message)}`);
}

export async function createCreatives(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const withPrice = text(data, "mode") === "preco";
  const result = await generateCreatives(productId, { withPrice });
  if (!result.ok) fail(productId, result.error);
  done(productId, `${result.created} capas geradas${withPrice ? " com o preço de agora" : " sem preço"}. Confira e aprove.`);
}

export async function approveCreative(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const creative = await prisma.creative.findUniqueOrThrow({ where: { id } });
  // Última conferência antes de aprovar: o preço da imagem ainda vale?
  if (creative.withPrice) await invalidateOutdatedCreatives(creative.productId);
  const approved = await prisma.creative.updateMany({
    where: { id, status: "PENDING_APPROVAL" },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  if (approved.count === 0) fail(creative.productId, "Essa capa não está mais aguardando aprovação (pode ter perdido a validade). Gere de novo.");
  done(creative.productId, "Capa aprovada.");
}

export async function deleteCreative(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const creative = await prisma.creative.findUniqueOrThrow({ where: { id } });
  // Capa publicada é registro do que foi ao ar: não se apaga.
  if (creative.status === "PUBLISHED") fail(creative.productId, "Capa já publicada não pode ser removida.");
  if (await prisma.publication.count({ where: { creativeId: id } })) fail(creative.productId, "Capa vinculada ao histórico de distribuição não pode ser removida.");
  await prisma.creative.delete({ where: { id } });
  await deleteCreativeFile(creative.file);
  done(creative.productId, "Capa removida.");
}
