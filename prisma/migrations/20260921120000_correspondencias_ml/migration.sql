-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'AUTO', 'REJECTED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "mlMatchCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "match_suggestions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceCents" INTEGER,
    "score" INTEGER NOT NULL,
    "reasons" TEXT[],
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_suggestions_status_score_idx" ON "match_suggestions"("status", "score");

-- CreateIndex
CREATE UNIQUE INDEX "match_suggestions_productId_catalogId_key" ON "match_suggestions"("productId", "catalogId");

-- AddForeignKey
ALTER TABLE "match_suggestions" ADD CONSTRAINT "match_suggestions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
