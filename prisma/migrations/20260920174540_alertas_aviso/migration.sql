-- AlterTable
ALTER TABLE "price_alerts" ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifiedPriceCents" INTEGER;

