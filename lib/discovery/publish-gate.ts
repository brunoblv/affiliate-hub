import { prisma } from "@/lib/db";
import { asSections } from "@/lib/content/validate";
import { discoveryConfig } from "./config";

/**
 * Portão de publicação (A.9), distinto do portão de SEO/AdSense (`lib/adsense/quality.ts`, que
 * continua exigindo sete dias de histórico). Aqui o que se decide é se o produto descoberto está
 * completo o bastante para sair de rascunho. `DISCOVERY_AUTOPUBLISH` nasce desligado: o portão
 * serve, antes de tudo, para explicar a pendência de cada produto na fila de revisão.
 */
export interface PublicationFacts {
  name: string;
  hasVerifiedCover: boolean;
  hasNicheOrCategory: boolean;
  hasActiveOffer: boolean;
  contentPublished: boolean;
  descriptionLength: number;
  score: number | null;
}

export const MIN_DESCRIPTION_LENGTH = 120;

export function publicationBlockers(facts: PublicationFacts, minScore: number): string[] {
  const blockers: string[] = [];
  if (!facts.name.trim()) blockers.push("sem nome");
  if (!facts.hasVerifiedCover) blockers.push("sem foto verificada");
  if (!facts.hasNicheOrCategory) blockers.push("sem nicho ou categoria");
  if (!facts.hasActiveOffer) blockers.push("sem oferta atual com link ativo");
  if (!facts.contentPublished) blockers.push("conteúdo editorial não publicado");
  else if (facts.descriptionLength < MIN_DESCRIPTION_LENGTH) blockers.push("descrição com menos de 120 caracteres");
  if (facts.score === null || facts.score < minScore) blockers.push(`pontuação abaixo de ${minScore}`);
  return blockers;
}

const productFactsInclude = {
  images: { select: { verifiedAt: true, broken: true, isCover: true } },
  niches: { select: { nicheId: true } },
  content: { select: { status: true, sections: true } },
  variants: {
    select: {
      offers: {
        where: { active: true, priceCents: { not: null }, store: { active: true }, links: { some: { active: true } } },
        select: { id: true },
        take: 1,
      },
    },
  },
} as const;

/** Pendências de vários produtos de uma vez (fila de revisão em lote). */
export async function blockersForProducts(productIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (productIds.length === 0) return result;
  const { publishMinScore } = discoveryConfig();
  const [products, candidates] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, include: productFactsInclude }),
    prisma.productCandidate.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, score: true },
    }),
  ]);
  const scores = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate.productId) scores.set(candidate.productId, Math.max(scores.get(candidate.productId) ?? 0, candidate.score));
  }
  for (const product of products) {
    const sections = product.content?.status === "PUBLISHED" ? asSections(product.content.sections) : null;
    result.set(
      product.id,
      publicationBlockers(
        {
          name: product.name,
          hasVerifiedCover: product.images.some((image) => image.verifiedAt !== null && !image.broken),
          hasNicheOrCategory: product.niches.length > 0 || product.categoryId !== null,
          hasActiveOffer: product.variants.some((variant) => variant.offers.length > 0),
          contentPublished: product.content?.status === "PUBLISHED",
          descriptionLength: sections?.description.trim().length ?? 0,
          score: scores.get(product.id) ?? null,
        },
        publishMinScore,
      ),
    );
  }
  return result;
}

/** Publica os produtos que passam no portão. Só age com DISCOVERY_AUTOPUBLISH=true. */
export async function publishReadyProducts(): Promise<number> {
  if (!discoveryConfig().autopublish) return 0;
  const imported = await prisma.productCandidate.findMany({
    where: { status: "IMPORTED", productId: { not: null } },
    select: { productId: true },
    orderBy: { lastSeenAt: "desc" },
    take: 500,
  });
  const drafts = await prisma.product.findMany({
    where: { id: { in: imported.map((item) => item.productId!) }, status: "DRAFT" },
    select: { id: true },
  });
  const ids = drafts.map((draft) => draft.id);
  const blockers = await blockersForProducts(ids);
  const ready = ids.filter((id) => blockers.get(id)?.length === 0);
  if (ready.length === 0) return 0;
  const { count } = await prisma.product.updateMany({ where: { id: { in: ready }, status: "DRAFT" }, data: { status: "PUBLISHED" } });
  return count;
}
