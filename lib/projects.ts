import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";

/** Resolve um AffiliateProject pelo slug da URL (/admin/afiliados/[project]/...) — 404 se não existir. */
export async function getProjectBySlug(slug: string) {
  const project = await prisma.affiliateProject.findUnique({ where: { slug } });
  if (!project) notFound();
  return project;
}
