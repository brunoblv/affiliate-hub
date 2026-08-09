-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "time" TEXT NOT NULL,
    "categoryId" TEXT,
    "campaignId" TEXT,
    "contentType" "ContentType",
    "minScore" DECIMAL(5,2),
    "minDiscount" DECIMAL(5,2),
    "minPrice" DECIMAL(12,2),
    "maxPrice" DECIMAL(12,2),
    "postsPerSlot" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_slots_active_idx" ON "schedule_slots"("active");
