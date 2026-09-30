import { randomUUID } from "node:crypto";
import webpush from "web-push";
import { prisma } from "@/lib/db";
import { getCatalogProductsByIds } from "@/lib/catalog";
import type { PriceAlert, PushSubscription } from "@/lib/generated/prisma/client";
import { confirmedAlertContext, alertLowest, alertProductPath, alertContextLabel } from "@/lib/alerts/context";
import { money } from "@/lib/format";
import { pushConfig } from "./config";
import { pushFailure, validEndpoint } from "./validation";

type PushAlert = PriceAlert & { user: { pushSubscriptions: PushSubscription[] } };
export interface PushDeps {
  send: ((subscription: PushSubscription, payload: string) => Promise<unknown>) | null;
  list: () => Promise<PushAlert[]>;
  products: typeof getCatalogProductsByIds;
  now: () => Date;
}

export async function evaluatePushAlerts(overrides: Partial<PushDeps> = {}) {
  const config = pushConfig();
  const deps: PushDeps = {
    send: config ? (subscription, payload) => webpush.sendNotification({ endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload,
    { vapidDetails: config, TTL: 900, timeout: 15_000, urgency: "normal" }) : null,
    list: () => prisma.priceAlert.findMany({
      where: { contextKey: { not: null }, variantId: { not: null }, user: { pushSubscriptions: { some: {} } } },
      include: { user: { select: { pushSubscriptions: true } } },
    }),
    products: getCatalogProductsByIds, now: () => new Date(), ...overrides,
  };
  const result = { sent: 0, failed: 0, expired: 0, rearmed: 0 };
  if (!deps.send) return result;
  const alerts = await deps.list();
  const products = await deps.products([...new Set(alerts.map((a) => a.productId))]);
  for (const alert of alerts) {
    const context = confirmedAlertContext(alert);
    const found = products.get(alert.productId);
    const lowest = alertLowest(found, context);
    if (!context || !found || lowest === null) continue;
    for (const subscription of alert.user.pushSubscriptions) {
      if (!validEndpoint(subscription.endpoint)) continue;
      // Verifica exclusão/edição durante a avaliação e evita recriar inscrições revogadas.
      const state = await prisma.$transaction(async (tx) => {
        const current = await tx.priceAlert.findFirst({ where: { id: alert.id, revision: alert.revision,
          user: { pushSubscriptions: { some: { id: subscription.id } } } } });
        if (!current) return null;
        return tx.pushDelivery.upsert({ where: { alertId_subscriptionId: { alertId: alert.id, subscriptionId: subscription.id } },
          create: { alertId: alert.id, subscriptionId: subscription.id, contextKey: alert.contextKey!, targetCents: alert.targetCents }, update: {} });
      }).catch((error: unknown) => {
        if (error && typeof error === "object" && "code" in error && (error.code === "P2003" || error.code === "P2002")) return null;
        throw error;
      });
      if (!state) continue;
      const guard = { id: state.id, status: state.status, token: state.token, contextKey: state.contextKey,
        targetCents: state.targetCents, alert: { revision: alert.revision } };
      if (state.status === "SENDING") {
        if (state.startedAt && state.startedAt.getTime() < deps.now().getTime() - 300_000)
          await prisma.pushDelivery.updateMany({ where: guard, data: { status: "UNCERTAIN", errorCode: "INTERRUPTED" } });
        continue;
      }
      const changed = state.contextKey !== alert.contextKey || state.targetCents !== alert.targetCents;
      // Rearma por preço/contexto, sem depender da revisão usada pelo canal de e-mail.
      if (changed || lowest > alert.targetCents) {
        if (changed || state.status !== "IDLE" || state.attemptCount > 0) {
          const reset = await prisma.pushDelivery.updateMany({ where: guard, data: { status: "IDLE", token: null,
            contextKey: alert.contextKey!, targetCents: alert.targetCents, attemptCount: 0,
            startedAt: null, nextAttemptAt: null, errorCode: null } });
          result.rearmed += reset.count;
        }
        continue;
      }
      if (state.status !== "IDLE" || state.nextAttemptAt && state.nextAttemptAt > deps.now()) continue;
      const token = randomUUID();
      const claim = await prisma.pushDelivery.updateMany({ where: guard,
        data: { status: "SENDING", token, startedAt: deps.now(), nextAttemptAt: null, attemptCount: { increment: 1 } } });
      if (!claim.count) continue;
      let accepted = false;
      try {
        // Revalida a revogação imediatamente antes do envio.
        if (!await prisma.pushSubscription.findUnique({ where: { id: subscription.id }, select: { id: true } })) continue;
        const label = found.product.variants.find((v) => v.id === context.variantId)!.label;
        await deps.send(subscription, JSON.stringify({
          body: `${found.product.name.slice(0, 100)}: ${money(lowest)} (sem frete). ${alertContextLabel(label, context).slice(0, 120)}`,
          url: alertProductPath(found.product.slug, context), tag: `alert-${alert.id}`,
        }));
        accepted = true;
        await prisma.pushDelivery.updateMany({ where: { id: state.id, token }, data: { status: "SENT", errorCode: null } });
        result.sent++;
      } catch (error) {
        const failure = pushFailure(accepted ? null : error);
        if (failure.expired) {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id, userId: alert.userId } });
          result.expired++; continue;
        }
        const retry = failure.retry && state.attemptCount + 1 < 3;
        await prisma.pushDelivery.updateMany({ where: { id: state.id, token }, data: {
          status: retry ? "IDLE" : failure.status, errorCode: failure.code,
          nextAttemptAt: retry ? new Date(deps.now().getTime() + 900_000 * (state.attemptCount + 1)) : null,
        } });
        result.failed++;
      }
    }
  }
  return result;
}
