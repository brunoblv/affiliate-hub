-- AlterTable
ALTER TABLE "products" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "clicks" (
    "id" TEXT NOT NULL,
    "linkId" TEXT,
    "offerId" TEXT,
    "productId" TEXT,
    "storeId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clicks_offerId_createdAt_idx" ON "clicks"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "clicks_productId_createdAt_idx" ON "clicks"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "affiliate_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

