"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProjectBySlug } from "@/lib/projects";
import { upsertCapturedProduct } from "@/lib/scrape/import-drafts";
import { runScoringPipeline } from "@/lib/scoring";

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || value === "") return undefined;
  const text = String(value).trim();
  // "19,90" ou "19.90"
  if (/^\d+([.,]\d{1,2})?$/.test(text)) {
    const n = Number(text.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  // "1.234,56"
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(text)) {
    const n = Number(text.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  const n = Number(text.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export async function saveCapturedProductAction(projectSlug: string, formData: FormData) {
  const project = await getProjectBySlug(projectSlug);

  const url = String(formData.get("url") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!url || !name) throw new Error("URL e nome são obrigatórios.");

  const price = parseNumber(formData.get("price"));
  if (price === undefined) throw new Error("Preço é obrigatório.");

  const product = await upsertCapturedProduct({
    projectId: project.id,
    url,
    name,
    price,
    originalPrice: parseNumber(formData.get("originalPrice")),
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || undefined,
    categoryId: String(formData.get("categoryId") ?? "").trim() || undefined,
    affiliateUrl: String(formData.get("affiliateUrl") ?? "").trim() || undefined,
    activate: formData.get("activate") === "on" || formData.get("activate") === "true",
  });

  await runScoringPipeline(product.id, { isNew: true });

  revalidatePath(`/admin/afiliados/${projectSlug}/revisar`);
  revalidatePath(`/admin/afiliados/${projectSlug}/produtos`);
  revalidatePath(`/admin/afiliados/${projectSlug}/capturar`);

  redirect(`/admin/afiliados/${projectSlug}/revisar?captured=1`);
}
