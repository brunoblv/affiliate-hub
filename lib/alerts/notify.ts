import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { PriceAlert } from "@/lib/generated/prisma/client";
import { getCatalogProductsByIds, type CatalogProduct } from "@/lib/catalog";
import { getMailer, type Mailer } from "@/lib/mail";
import { buildAlertEmail } from "./email";
import { alertContextLabel, alertLowest, alertProductPath, confirmedAlertContext } from "./context";
import { ALERT_MAX_ATTEMPTS, ALERT_RETRY_MS, ALERT_SEND_TIMEOUT_MS, mailFailure } from "./delivery";

export interface AlertRunResult { sent: number; rearmed: number; failed: number; waitingForMail: number }
export type AlertSnapshot = PriceAlert & { user: { email: string; name: string | null } };
type Finish = { status: "SENT" | "FAILED" | "UNCERTAIN"; code: string | null; retryAt: Date | null };

export interface AlertStore {
  recover(now: Date): Promise<void>;
  list(): Promise<AlertSnapshot[]>;
  products(ids: string[]): Promise<Map<string, CatalogProduct>>;
  rearm(alert: AlertSnapshot): Promise<boolean>;
  claim(alert: AlertSnapshot, price: number, now: Date): Promise<string | null>;
  finish(alert: AlertSnapshot, token: string, price: number, result: Finish, now: Date): Promise<void>;
}

/** Reservas e resultados persistidos: outro processo ou reinício vê o mesmo estado. */
export const databaseAlertStore: AlertStore = {
  async recover(now) {
    const before = new Date(now.getTime() - ALERT_SEND_TIMEOUT_MS);
    await prisma.$transaction([
      prisma.priceAlert.updateMany({
        where: { deliveryStatus: "SENDING", deliveryStartedAt: { lt: before } },
        data: { deliveryStatus: "UNCERTAIN" },
      }),
      prisma.priceAlertDelivery.updateMany({
        where: { status: "SENDING", startedAt: { lt: before } },
        data: { status: "UNCERTAIN", finishedAt: now, errorCode: "INTERRUPTED" },
      }),
    ]);
  },
  list: () => prisma.priceAlert.findMany({
    where: { contextKey: { not: null }, variantId: { not: null }, itemCondition: { not: null } },
    include: { user: { select: { email: true, name: true } } },
  }),
  products: getCatalogProductsByIds,
  async rearm(alert) {
    const result = await prisma.priceAlert.updateMany({
      where: { id: alert.id, revision: alert.revision, notifiedAt: alert.notifiedAt, deliveryStatus: "SENT" },
      data: { notifiedAt: null, notifiedPriceCents: null, deliveryStatus: "IDLE", deliveryToken: null,
        deliveryStartedAt: null, nextAttemptAt: null, attemptCount: 0, revision: { increment: 1 } },
    });
    return result.count > 0;
  },
  async claim(alert, price, now) {
    const token = randomUUID();
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.priceAlert.updateMany({
        where: { id: alert.id, revision: alert.revision, contextKey: alert.contextKey,
          notifiedAt: null, deliveryStatus: "IDLE",
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        data: { deliveryStatus: "SENDING", deliveryToken: token, deliveryStartedAt: now,
          attemptCount: { increment: 1 }, nextAttemptAt: null },
      });
      if (!claimed.count) return null;
      await tx.priceAlertDelivery.create({ data: {
        id: token, alertId: alert.id, revision: alert.revision, status: "SENDING",
        priceCents: price, targetCents: alert.targetCents, contextKey: alert.contextKey!, startedAt: now,
      } });
      return token;
    });
  },
  async finish(alert, token, price, result, now) {
    await prisma.$transaction([
      prisma.priceAlertDelivery.updateMany({ where: { id: token, alertId: alert.id },
        data: { status: result.status, errorCode: result.code, finishedAt: now } }),
      prisma.priceAlert.updateMany({
        where: { id: alert.id, revision: alert.revision, deliveryToken: token },
        data: { deliveryStatus: result.retryAt ? "IDLE" : result.status, nextAttemptAt: result.retryAt,
          notifiedAt: result.status === "SENT" ? now : null,
          notifiedPriceCents: result.status === "SENT" ? price : null },
      }),
    ]);
  },
};

export interface AlertDeps { mailer: Mailer | null; siteUrl: string; now: () => Date; store: AlertStore }

/** Uma notificação por passagem pela meta do contexto confirmado; SMTP não garante exactly-once. */
export async function evaluateAlerts(overrides: Partial<AlertDeps> = {}): Promise<AlertRunResult> {
  const deps: AlertDeps = {
    mailer: getMailer(), siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
    now: () => new Date(), store: databaseAlertStore, ...overrides,
  };
  const result: AlertRunResult = { sent: 0, rearmed: 0, failed: 0, waitingForMail: 0 };
  await deps.store.recover(deps.now());
  const alerts = await deps.store.list();
  if (!alerts.length) return result;
  const products = await deps.store.products([...new Set(alerts.map((alert) => alert.productId))]);

  for (const alert of alerts) {
    const context = confirmedAlertContext(alert);
    const found = products.get(alert.productId);
    const lowest = alertLowest(found, context);
    if (!context || !found || lowest === null) continue;
    if (alert.notifiedAt) {
      if (lowest > alert.targetCents && await deps.store.rearm(alert)) result.rearmed++;
      continue;
    }
    if (lowest > alert.targetCents || alert.deliveryStatus !== "IDLE"
      || (alert.nextAttemptAt && alert.nextAttemptAt > deps.now())) continue;
    if (!deps.mailer) { result.waitingForMail++; continue; }
    const token = await deps.store.claim(alert, lowest, deps.now());
    if (!token) continue;
    let accepted = false;
    try {
      await deps.mailer.send(buildAlertEmail({
        to: alert.user.email, userName: alert.user.name, productName: found.product.name,
        contextLabel: alertContextLabel(found.product.variants.find((variant) => variant.id === context.variantId)!.label, context),
        productUrl: `${deps.siteUrl}${alertProductPath(found.product.slug, context)}`,
        contaUrl: `${deps.siteUrl}/conta#alertas`, priceCents: lowest, targetCents: alert.targetCents,
      }));
      accepted = true;
      await deps.store.finish(alert, token, lowest, { status: "SENT", code: null, retryAt: null }, deps.now());
      result.sent++;
    } catch (error) {
      const failure = accepted ? { definite: false, code: "RESULT_NOT_SAVED" } : mailFailure(error);
      const retry = failure.definite && alert.attemptCount + 1 < ALERT_MAX_ATTEMPTS;
      await deps.store.finish(alert, token, lowest, {
        status: failure.definite ? "FAILED" : "UNCERTAIN", code: failure.code,
        retryAt: retry ? new Date(deps.now().getTime() + ALERT_RETRY_MS * (alert.attemptCount + 1)) : null,
      }, deps.now());
      result.failed++;
    }
  }
  return result;
}
