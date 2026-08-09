import { prisma } from "@/lib/database";
import type { NormalizedProduct } from "@/lib/integrations/types";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Rules Engine mínimo (docs/especificacao-automacao-produtos-chartfm.md §27):
 * ignora produtos cujo título contenha uma keyword bloqueada ou cujo
 * vendedor esteja bloqueado. Categoria bloqueada é aplicada no nível do
 * bucket (não buscamos por categorias bloqueadas).
 */
export async function isBlocked(product: NormalizedProduct): Promise<boolean> {
  const blocklist = await prisma.blocklist.findMany({ where: { active: true } });
  if (blocklist.length === 0) return false;

  const title = normalize(product.name);
  const seller = product.storeName ? normalize(product.storeName) : undefined;

  for (const entry of blocklist) {
    const value = normalize(entry.value);
    if (entry.type === "KEYWORD" && title.includes(value)) return true;
    if (entry.type === "SELLER" && seller && seller === value) return true;
  }

  return false;
}
