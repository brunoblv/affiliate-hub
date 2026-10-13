-- CreateEnum
CREATE TYPE "DiscoverySource" AS ENUM ('SHOPEE_API', 'SHOPEE_FEED', 'ALIEXPRESS_API');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('NEW', 'SELECTED', 'IMPORTED', 'DUPLICATE', 'REJECTED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ProductTier" AS ENUM ('BRANDED', 'GENERIC', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ShowcaseKind" AS ENUM ('ACHADOS', 'MAIS_VENDIDOS', 'MELHORES_OFERTAS', 'NOVIDADES');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "about" TEXT,
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "tier" "ProductTier" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "metricsCheckedAt" TIMESTAMP(3),
ADD COLUMN     "ratingCentis" INTEGER,
ADD COLUMN     "ratingCount" INTEGER,
ADD COLUMN     "salesCount" INTEGER;

-- CreateTable
CREATE TABLE "discovery_queries" (
    "id" TEXT NOT NULL,
    "source" "DiscoverySource" NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT,
    "sort" TEXT NOT NULL DEFAULT 'sales',
    "pages" INTEGER NOT NULL DEFAULT 2,
    "nicheId" TEXT,
    "categoryId" TEXT,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_runs" (
    "id" TEXT NOT NULL,
    "queryId" TEXT,
    "source" "DiscoverySource" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB NOT NULL,
    "found" INTEGER NOT NULL DEFAULT 0,
    "kept" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "rejections" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_candidates" (
    "id" TEXT NOT NULL,
    "source" "DiscoverySource" NOT NULL,
    "externalListingId" TEXT NOT NULL,
    "externalSellerId" TEXT,
    "sellerName" TEXT,
    "officialStore" BOOLEAN,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceCents" INTEGER NOT NULL,
    "previousPriceCents" INTEGER,
    "salesCount" INTEGER,
    "ratingCentis" INTEGER,
    "ratingCount" INTEGER,
    "commissionPct" INTEGER,
    "discountPct" INTEGER,
    "categoryPath" TEXT[],
    "brandId" TEXT,
    "tier" "ProductTier" NOT NULL DEFAULT 'UNKNOWN',
    "score" INTEGER NOT NULL,
    "reasons" TEXT[],
    "fingerprint" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'NEW',
    "statusReason" TEXT,
    "runId" TEXT,
    "queryId" TEXT,
    "productId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "weight" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_terms" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,

    CONSTRAINT "blocked_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_entries" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "kind" "ShowcaseKind" NOT NULL,
    "day" DATE NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "priceObservedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discovery_queries_source_active_position_idx" ON "discovery_queries"("source", "active", "position");

-- CreateIndex
CREATE INDEX "discovery_runs_source_startedAt_idx" ON "discovery_runs"("source", "startedAt");

-- CreateIndex
CREATE INDEX "product_candidates_status_score_idx" ON "product_candidates"("status", "score");

-- CreateIndex
CREATE INDEX "product_candidates_fingerprint_idx" ON "product_candidates"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "product_candidates_source_externalListingId_key" ON "product_candidates"("source", "externalListingId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_terms_term_key" ON "blocked_terms"("term");

-- CreateIndex
CREATE INDEX "showcase_entries_storeId_kind_day_position_idx" ON "showcase_entries"("storeId", "kind", "day", "position");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_entries_storeId_kind_day_productId_key" ON "showcase_entries"("storeId", "kind", "day", "productId");

-- CreateIndex
CREATE INDEX "products_tier_idx" ON "products"("tier");

-- AddForeignKey
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "discovery_queries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_entries" ADD CONSTRAINT "showcase_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_entries" ADD CONSTRAINT "showcase_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_entries" ADD CONSTRAINT "showcase_entries_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
