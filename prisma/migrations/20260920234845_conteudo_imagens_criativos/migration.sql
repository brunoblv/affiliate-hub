-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PENDING', 'GENERATING', 'DRAFT', 'REVIEWED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'INVALIDATED');

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "broken" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "product_contents" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "sourceMaterial" TEXT,
    "sections" JSONB,
    "protectedKeys" TEXT[],
    "issues" JSONB,
    "pendencies" JSONB,
    "model" TEXT,
    "promptVersion" TEXT,
    "inputSnapshot" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "error" TEXT,
    "generationStartedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creatives" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "file" TEXT NOT NULL,
    "status" "CreativeStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "withPrice" BOOLEAN NOT NULL DEFAULT false,
    "priceCents" INTEGER,
    "priceObservedAt" TIMESTAMP(3),
    "invalidatedReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_contents_productId_key" ON "product_contents"("productId");

-- CreateIndex
CREATE INDEX "creatives_productId_status_idx" ON "creatives"("productId", "status");

-- AddForeignKey
ALTER TABLE "product_contents" ADD CONSTRAINT "product_contents_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

