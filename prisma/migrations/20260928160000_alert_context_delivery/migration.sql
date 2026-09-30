-- Preserve todos os alertas: contexto legado nulo exige escolha explícita.
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('IDLE', 'SENDING', 'SENT', 'FAILED', 'UNCERTAIN');
ALTER TABLE "price_alerts"
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "itemCondition" "ItemCondition",
  ADD COLUMN "priceCondition" TEXT,
  ADD COLUMN "contextKey" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryStatus" "AlertDeliveryStatus" NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "deliveryToken" TEXT,
  ADD COLUMN "deliveryStartedAt" TIMESTAMP(3),
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "price_alerts_userId_productId_key";
CREATE UNIQUE INDEX "price_alerts_userId_productId_contextKey_key" ON "price_alerts"("userId", "productId", "contextKey");
CREATE INDEX "price_alerts_variantId_idx" ON "price_alerts"("variantId");
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "price_alert_deliveries" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "status" "AlertDeliveryStatus" NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "targetCents" INTEGER NOT NULL,
  "contextKey" TEXT NOT NULL,
  "errorCode" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "price_alert_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "price_alert_deliveries_alertId_startedAt_idx" ON "price_alert_deliveries"("alertId", "startedAt");
CREATE INDEX "price_alert_deliveries_status_startedAt_idx" ON "price_alert_deliveries"("status", "startedAt");
ALTER TABLE "price_alert_deliveries" ADD CONSTRAINT "price_alert_deliveries_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "price_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
