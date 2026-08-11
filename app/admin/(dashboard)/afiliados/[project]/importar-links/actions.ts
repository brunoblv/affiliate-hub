"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProjectBySlug } from "@/lib/projects";
import { enqueueUrlScrapes, getScrapeDelayMinutes } from "@/lib/scrape";

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
