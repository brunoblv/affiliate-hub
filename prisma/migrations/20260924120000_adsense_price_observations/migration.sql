ALTER TABLE "price_points"
  ADD COLUMN "priceCondition" TEXT,
  ADD COLUMN "installmentPriceCents" INTEGER,
  ADD COLUMN "shippingKind" "ShippingKind",
  ADD COLUMN "shippingCents" INTEGER,
  ADD COLUMN "syncJobId" TEXT;

CREATE UNIQUE INDEX "price_points_syncJobId_key" ON "price_points"("syncJobId");
