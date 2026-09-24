CREATE TYPE "MetricKind" AS ENUM ('SEARCH', 'PRODUCT_VIEW');
CREATE TABLE "metric_events" (
  "id" TEXT NOT NULL,
  "kind" "MetricKind" NOT NULL,
  "productId" TEXT,
  "nicheId" TEXT,
  "term" TEXT,
  "resultCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "metric_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "metric_events_createdAt_kind_idx" ON "metric_events"("createdAt", "kind");
CREATE INDEX "metric_events_kind_term_createdAt_idx" ON "metric_events"("kind", "term", "createdAt");
CREATE INDEX "metric_events_productId_createdAt_idx" ON "metric_events"("productId", "createdAt");
CREATE INDEX "clicks_createdAt_idx" ON "clicks"("createdAt");
CREATE INDEX "community_clicks_createdAt_idx" ON "community_clicks"("createdAt");
