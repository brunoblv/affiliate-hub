"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { ProjectType } from "@/lib/generated/prisma/client";

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueProjectSlug(base: string): Promise<string> {
  const root = toSlug(base) || "projeto";
  let candidate = root;
  let i = 0;
  while (await prisma.affiliateProject.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    i += 1;
    candidate = `${root}-${i}`;
  }
  return candidate;
}

function parseProjectType(value: string): ProjectType {
  if (Object.values(ProjectType).includes(value as ProjectType)) {
    return value as ProjectType;
  }
  throw new Error("Tipo de projeto inválido.");
}

function revalidateProjectPaths(slug?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  if (slug) {
    revalidatePath(`/admin/afiliados/${slug}`);
    revalidatePath(`/admin/projects`);
  }
}

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const type = parseProjectType(String(formData.get("type") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const customSlug = String(formData.get("slug") ?? "").trim();
  const slug = await uniqueProjectSlug(customSlug || name);

  await prisma.affiliateProject.create({
    data: { name, slug, type, description },
  });

  revalidateProjectPaths(slug);
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const project = await prisma.affiliateProject.findUniqueOrThrow({ where: { id: projectId } });

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const type = parseProjectType(String(formData.get("type") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;

  await prisma.affiliateProject.update({
    where: { id: projectId },
    data: { name, type, description },
  });

  revalidateProjectPaths(project.slug);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function toggleProjectActiveAction(projectId: string) {
  const project = await prisma.affiliateProject.findUniqueOrThrow({ where: { id: projectId } });
  await prisma.affiliateProject.update({
    where: { id: projectId },
    data: { active: !project.active },
  });
  revalidateProjectPaths(project.slug);
}
