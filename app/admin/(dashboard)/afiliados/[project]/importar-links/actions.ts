"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProjectBySlug } from "@/lib/projects";
import { importDraftUrls } from "@/lib/scrape/import-drafts";
import { enqueueUrlScrapes, getScrapeDelayMinutes } from "@/lib/scrape";

/** Padrão: só grava a URL como rascunho (não usa Playwright). */
export async function importProjectDraftUrlsAction(projectSlug: string, formData: FormData) {
  const project = await getProjectBySlug(projectSlug);
  const text = String(formData.get("urls") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim() || undefined;

  const result = await importDraftUrls({
    projectId: project.id,
    text,
    categoryId,
  });

  revalidatePath(`/admin/afiliados/${projectSlug}/importar-links`);
  revalidatePath(`/admin/afiliados/${projectSlug}/revisar`);
  revalidatePath(`/admin/afiliados/${projectSlug}/produtos`);

  redirect(
    `/admin/afiliados/${projectSlug}/revisar?imported=${result.created + result.updated}&created=${result.created}`,
  );
}

/** Opcional: tenta scrape Playwright (costuma falhar na TikTok com Security Check). */
export async function enqueueProjectUrlScrapesAction(projectSlug: string, formData: FormData) {
  const project = await getProjectBySlug(projectSlug);
  const text = String(formData.get("urls") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim() || undefined;
  const delayRaw = Number(formData.get("delayMinutes") ?? "");
  const delayMinutes = Number.isFinite(delayRaw) && delayRaw >= 1 ? delayRaw : await getScrapeDelayMinutes();

  const result = await enqueueUrlScrapes({
    projectId: project.id,
    projectSlug: project.slug,
    text,
    categoryId,
    delayMinutes,
  });

  revalidatePath(`/admin/afiliados/${projectSlug}/importar-links`);
  revalidatePath(`/admin/afiliados/${projectSlug}/revisar`);
  revalidatePath(`/admin/afiliados/${projectSlug}/produtos`);

  redirect(
    `/admin/afiliados/${projectSlug}/importar-links?queued=${result.queued}&delay=${result.delayMinutes}`,
  );
}
