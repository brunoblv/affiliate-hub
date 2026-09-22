import { prisma } from "@/lib/db";
import { getProductsByIds } from "@/lib/catalog";
import { getMailer, type Mailer } from "@/lib/mail";
import { buildAlertEmail } from "./email";

export interface AlertRunResult {
  sent: number;
  rearmed: number;
  failed: number;
  /** Alertas na meta que não puderam ser avisados porque o e-mail não está configurado. */
  waitingForMail: number;
}

export interface AlertDeps {
  mailer: Mailer | null;
  siteUrl: string;
  now: () => Date;
}

/** Depois de uma falha de envio, o mesmo alerta só é tentado de novo após esta pausa. */
const RETRY_COOLDOWN_MS = 15 * 60 * 1000;
const lastFailure = new Map<string, number>();

/**
 * Avisa quem criou alerta quando o MENOR PREÇO ELEGÍVEL do produto chega à meta.
 *
 * - Um aviso por passagem pela meta: `notifiedAt` guarda que já avisamos.
 * - Se o preço volta a ficar acima da meta, o alerta é rearmado e avisa de novo na próxima queda.
 * - Alterar a meta na conta também rearma.
 * - O envio é "reservado" antes (UPDATE condicional), então dois workers nunca mandam o mesmo aviso;
 *   se o e-mail falhar, a reserva é desfeita e uma nova tentativa acontece depois da pausa.
 */
export async function evaluateAlerts(overrides: Partial<AlertDeps> = {}): Promise<AlertRunResult> {
  const deps: AlertDeps = {
    mailer: getMailer(),
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
    now: () => new Date(),
    ...overrides,
  };
  const result: AlertRunResult = { sent: 0, rearmed: 0, failed: 0, waitingForMail: 0 };

  const alerts = await prisma.priceAlert.findMany({
    include: { user: { select: { email: true, name: true } } },
  });
  if (alerts.length === 0) return result;

  const products = await getProductsByIds([...new Set(alerts.map((alert) => alert.productId))]);

  for (const alert of alerts) {
    const product = products.get(alert.productId);
    const lowest = product?.prices.lowestCents ?? null;
    // Produto despublicado ou sem oferta atual: nada a concluir, nem avisar nem rearmar.
    if (!product || lowest === null) continue;

    if (alert.notifiedAt) {
      if (lowest > alert.targetCents) {
        await prisma.priceAlert.update({ where: { id: alert.id }, data: { notifiedAt: null, notifiedPriceCents: null } });
        result.rearmed++;
      }
      continue;
    }
    if (lowest > alert.targetCents) continue;

    if (!deps.mailer) {
      result.waitingForMail++;
      continue;
    }
    const failedAt = lastFailure.get(alert.id);
    if (failedAt && deps.now().getTime() - failedAt < RETRY_COOLDOWN_MS) continue;

    const claimed = await prisma.priceAlert.updateMany({
      where: { id: alert.id, notifiedAt: null },
      data: { notifiedAt: deps.now(), notifiedPriceCents: lowest },
    });
    if (claimed.count === 0) continue; // outro worker já reservou

    try {
      await deps.mailer.send(
        buildAlertEmail({
          to: alert.user.email,
          userName: alert.user.name,
          productName: product.name,
          productUrl: `${deps.siteUrl}/produto/${product.slug}`,
          contaUrl: `${deps.siteUrl}/conta#alertas`,
          priceCents: lowest,
          targetCents: alert.targetCents,
        }),
      );
      lastFailure.delete(alert.id);
      result.sent++;
    } catch (error) {
      console.error(
        JSON.stringify({ message: "falha ao enviar aviso de alerta", alertId: alert.id, erro: error instanceof Error ? error.message : String(error) }),
      );
      await prisma.priceAlert.update({ where: { id: alert.id }, data: { notifiedAt: null, notifiedPriceCents: null } });
      lastFailure.set(alert.id, deps.now().getTime());
      result.failed++;
    }
  }
  return result;
}
