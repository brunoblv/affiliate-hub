import { prisma } from "@/lib/database";

/** Projeto Umbanda (docs/modulo-afiliados-umbanda.md) — criado no seed com slug fixo. */
export function getUmbandaProject() {
  return prisma.affiliateProject.findUniqueOrThrow({ where: { slug: "umbanda" } });
}
