"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueCategorySlug(base: string): Promise<string> {
  const root = toSlug(base) || "categoria";
  let candidate = root;
  let i = 0;
  while (await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    i += 1;
    candidate = `${root}-${i}`;
  }
  return candidate;
}

export async function createCategoryAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Projeto é obrigatório.");

  const project = await prisma.affiliateProject.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Projeto não encontrado.");

  const parentId = String(formData.get("parentId") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const customSlug = String(formData.get("slug") ?? "").trim();

  let parentSlug: string | undefined;
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new Error("Categoria pai não encontrada.");
    if (parent.projectId !== projectId) {
      throw new Error("A categoria pai precisa pertencer ao mesmo projeto.");
    }
    parentSlug = parent.slug;
  }

  const slugBase = customSlug || (parentSlug ? `${parentSlug}-${name}` : name);
  const slug = await uniqueCategorySlug(slugBase);

  await prisma.category.create({
    data: {
      projectId,
      name,
      slug,
      description,
      parentId: parentId ?? null,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function updateCategoryAction(categoryId: string, formData: FormData) {
  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  const description = String(formData.get("description") ?? "").trim() || null;
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  const parentId = parentIdRaw || null;

  if (parentId) {
    if (parentId === categoryId) throw new Error("Uma categoria não pode ser pai de si mesma.");
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new Error("Categoria pai não encontrada.");
    if (parent.projectId !== category.projectId) {
      throw new Error("A categoria pai precisa pertencer ao mesmo projeto.");
    }
    if (parent.parentId === categoryId) {
      throw new Error("Não é possível criar ciclo na hierarquia.");
    }
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { name, description, parentId },
  });

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${categoryId}`);
  revalidatePath("/admin/products");
}

export async function toggleCategoryActiveAction(categoryId: string) {
  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  await prisma.category.update({
    where: { id: categoryId },
    data: { active: !category.active },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}
