import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { FetchResult } from "@/lib/connectors/types";
import { observedCommercialContext } from "@/lib/connectors/commercial-context";
import type { SyncConfig } from "./config";
import { invalidateOutdatedCreatives } from "@/lib/creatives/invalidate";

/** Oferta com o que a aplicação do resultado precisa. */
export type OfferForSync = NonNullable<Awaited<ReturnType<typeof loadOffer>>>;

export function loadOffer(id: string) {
  return prisma.offer.findUnique({
    where: { id },
    include: {
      store: true,
      links: { select: { id: true } },
      variant: { select: { productId: true, product: { select: { images: { select: { id: true }, take: 1 } } } } },
    },
  });
}

export type Outcome =
  | { kind: "updated"; priceCents: number; previousCents: number | null }
  | { kind: "unchanged"; priceCents: number }
  | { kind: "review"; priceCents: number; pendingCents: number; reason: string }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

const newShortCode = () => randomBytes(5).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");

const pct = (from: number, to: number) => Math.round((Math.abs(to - from) / from) * 100);

/**
 * Aplica uma coleta bem-sucedida. Regras (RF-08):
 * - cada consulta bem-sucedida ganha uma observação, mesmo sem alteração do preço;
 * - variação abrupta não é publicada: o valor antigo fica e o novo aguarda revisão;
 * - o link de afiliado já cadastrado nunca é sobrescrito.
 */
export async function applySuccess(
  offer: OfferForSync,
  result: Extract<FetchResult, { kind: "ok" }>,
  now: Date,
  config: SyncConfig,
  jobId?: string,
): Promise<Outcome> {
  const previous = offer.priceCents;
  const suspicious = previous !== null && previous > 0 && Math.abs(result.priceCents - previous) / previous > config.maxPriceChange;

  if (suspicious) {
    const reason = `Preço coletado (${result.priceCents / 100}) varia ${pct(previous, result.priceCents)}% em relação ao publicado (${previous / 100}).`;
    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        lastAttemptAt: now,
        lastError: null,
        needsReview: true,
        pendingPriceCents: result.priceCents,
        reviewReason: reason,
      },
    });
    return { kind: "review", priceCents: previous, pendingCents: result.priceCents, reason };
  }

  const changed = previous !== result.priceCents;
  const { installments, ...context } = observedCommercialContext(result.commercialContext);
  const productHasImage = offer.variant.product.images.length > 0;

  await prisma.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offer.id },
      data: {
        priceCents: result.priceCents,
        ...context,
        installments,
        shippingKind: context.shippingKind ?? "UNKNOWN",
        previousPriceCents: result.previousPriceCents,
        priceCheckedAt: result.observedAt,
        lastAttemptAt: now,
        lastError: null,
        consecutiveFailures: 0,
        status: "ACTIVE",
        method: "API",
        needsReview: false,
        pendingPriceCents: null,
        reviewReason: null,
        ...(result.availability ? { availability: result.availability } : {}),
      },
    });
    await tx.pricePoint.createMany({
      data: [{
          offerId: offer.id,
          variantId: offer.variantId,
          itemCondition: offer.condition,
          priceCents: result.priceCents,
          ...context,
          availability: result.availability ?? "UNKNOWN",
          source: "API",
          observedAt: result.observedAt,
          syncJobId: jobId ?? null,
        }],
      skipDuplicates: Boolean(jobId),
    });
    if (offer.links.length === 0 && result.affiliateUrl) {
      await tx.affiliateLink.create({
        data: { offerId: offer.id, url: result.affiliateUrl, shortCode: newShortCode(), label: "Coletado pelo conector" },
      });
    }
    if (!productHasImage && result.imageUrl) {
      await tx.productImage.create({
        data: {
          productId: offer.variant.productId,
          variantId: offer.variantId,
          url: result.imageUrl,
          alt: result.title,
          position: 0,
          isCover: true,
          source: offer.store.connector ?? "conector",
          verifiedAt: now,
        },
      });
    }
  });

  if (changed) await invalidateOutdatedCreatives(offer.variant.productId);

  return changed
    ? { kind: "updated", priceCents: result.priceCents, previousCents: previous }
    : { kind: "unchanged", priceCents: result.priceCents };
}

/**
 * Falha de coleta: o último preço é preservado (nunca vira zero) e envelhece até
 * deixar de valer como oferta atual. Falhas seguidas sinalizam a oferta.
 */
export async function applyFailure(
  offer: OfferForSync,
  failure: { kind: "not_found" } | { kind: "error"; message: string },
  now: Date,
  config: SyncConfig,
): Promise<Outcome> {
  const failures = offer.consecutiveFailures + 1;
  const message = failure.kind === "not_found" ? "Anúncio não encontrado na fonte." : failure.message;
  const status =
    failure.kind === "not_found"
      ? failures >= config.notFoundUntilStale
        ? "STALE"
        : offer.status
      : failures >= config.failuresUntilError
        ? "ERROR"
        : offer.status;

  await prisma.offer.update({
    where: { id: offer.id },
    data: { consecutiveFailures: failures, lastAttemptAt: now, lastError: message.slice(0, 500), status },
  });
  return failure.kind === "not_found" ? { kind: "not_found" } : { kind: "error", message };
}

/** Aprova o valor em revisão: vira o preço publicado, com ponto no histórico. */
export async function approvePending(offerId: string, now = new Date()): Promise<boolean> {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer?.needsReview || offer.pendingPriceCents === null) return false;
  await prisma.$transaction([
    prisma.offer.update({
      where: { id: offerId },
      data: {
        priceCents: offer.pendingPriceCents,
        priceCheckedAt: now,
        status: "ACTIVE",
        needsReview: false,
        pendingPriceCents: null,
        reviewReason: null,
      },
    }),
    prisma.pricePoint.create({
      data: {
        offerId, variantId: offer.variantId, itemCondition: offer.condition,
        priceCents: offer.pendingPriceCents, availability: offer.availability, source: "API", observedAt: now,
      },
    }),
  ]);
  await invalidateOutdatedCreatives();
  return true;
}

/** Recusa o valor em revisão: o preço publicado continua o mesmo. */
export async function rejectPending(offerId: string): Promise<boolean> {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer?.needsReview) return false;
  await prisma.offer.update({
    where: { id: offerId },
    data: { needsReview: false, pendingPriceCents: null, reviewReason: null },
  });
  return true;
}
