CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "push_deliveries" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "contextKey" TEXT NOT NULL,
  "targetCents" INTEGER NOT NULL,
  "status" "AlertDeliveryStatus" NOT NULL DEFAULT 'IDLE',
  "token" TEXT,
  "startedAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  CONSTRAINT "push_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_deliveries_alertId_subscriptionId_key" ON "push_deliveries"("alertId", "subscriptionId");
CREATE INDEX "push_deliveries_status_startedAt_idx" ON "push_deliveries"("status", "startedAt");
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "price_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
