import { prisma } from "@/lib/db";
import { getCatalogProductsByIds } from "@/lib/catalog";
import { money } from "@/lib/format";
import { alertContextKey, alertLowest, alertOffers, confirmedAlertContext, type AlertContext } from "./context";
import { normalizedPriceCondition } from "@/lib/history/variant";

export class AlertInputError extends Error {}

export interface SaveAlertInput {
  productId: string;
  alertId: string;
  targetCents: number;
  variantId: string;
  itemCondition: string;
  priceCondition: string;
  reactivate: boolean;
}

export async function savePriceAlert(userId: string, input: SaveAlertInput, deps = {
  db: prisma, loadCatalog: getCatalogProductsByIds,
}) {
  if (!Number.isSafeInteger(input.targetCents) || input.targetCents <= 0 || input.targetCents > 100_000_000) {
    throw new AlertInputError("Informe um preço desejado válido.");
  }
  const previous = input.alertId
    ? await deps.db.priceAlert.findFirst({ where: { id: input.alertId, userId, productId: input.productId } })
    : null;
  if (input.alertId && !previous) throw new AlertInputError("Alerta não encontrado na sua conta.");
  if (previous?.deliveryStatus === "SENDING") throw new AlertInputError("Um aviso está sendo processado. Tente editar novamente em alguns minutos.");
  let context = previous ? confirmedAlertContext(previous) : null;
  const found = (await deps.loadCatalog([input.productId])).get(input.productId);
  if (!found) throw new AlertInputError("Produto indisponível.");
  if (!context) {
    if (!input.variantId || !["NEW", "USED"].includes(input.itemCondition) || input.priceCondition.length > 200) {
      throw new AlertInputError("Escolha a variação, a condição do item e o pagamento na página do produto.");
    }
    context = { variantId: input.variantId, itemCondition: input.itemCondition as AlertContext["itemCondition"],
      priceCondition: normalizedPriceCondition(input.priceCondition) };
    // Cadastro usa somente contextos realmente existentes no catálogo afiliado público.
    if (!alertOffers(found, context).length) throw new AlertInputError("Essa combinação não está disponível. Escolha uma oferta na página do produto.");
  }
  if (!found.product.variants.some((variant) => variant.id === context.variantId)) {
    throw new AlertInputError("A variação não está mais disponível. Escolha novamente na página do produto.");
  }
  const lowest = alertLowest(found, context);
  const key = alertContextKey(context);
  if (previous?.contextKey === key && previous.targetCents === input.targetCents && !input.reactivate) return;
  if (lowest !== null && input.targetCents >= lowest) {
    throw new AlertInputError(`O preço desejado precisa ser menor que o atual desta opção (${money(lowest)}).`);
  }

  try {
    await deps.db.$transaction(async (tx) => {
      const data = { variantId: context.variantId, itemCondition: context.itemCondition,
        priceCondition: context.priceCondition, contextKey: key, targetCents: input.targetCents };
      if (previous) {
        const updated = await tx.priceAlert.updateMany({
          where: { id: previous.id, userId, revision: previous.revision, deliveryStatus: { not: "SENDING" } },
          data: { ...data, revision: { increment: 1 }, notifiedAt: null, notifiedPriceCents: null,
            deliveryStatus: "IDLE", deliveryToken: null, deliveryStartedAt: null, nextAttemptAt: null, attemptCount: 0 },
        });
        if (!updated.count) throw new AlertInputError("O alerta mudou durante a edição. Atualize a página e tente novamente.");
      } else {
        await tx.priceAlert.create({ data: { ...data, userId, productId: input.productId } });
      }
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new AlertInputError("Você já tem um alerta para essa opção. Edite-o em Minha conta.");
    }
    throw error;
  }
}
