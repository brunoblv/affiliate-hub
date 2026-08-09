-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('SHOPEE', 'TIKTOK_SHOP', 'AMAZON', 'ALIEXPRESS', 'MAGALU', 'MERCADO_LIVRE', 'OUTRAS');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TELEGRAM', 'WEBSITE', 'BLOG', 'PINTEREST', 'OUTROS');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('PRICE_DROP', 'HIGH_DISCOUNT', 'HIGH_SALES', 'TRENDING', 'HIGH_COMMISSION', 'HIGH_CONVERSION', 'NEW_PRODUCT', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CONVERTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('FACEBOOK_POST', 'INSTAGRAM_POST', 'INSTAGRAM_STORY', 'INSTAGRAM_REEL', 'TIKTOK_VIDEO', 'TELEGRAM_POST', 'BLOG_ARTICLE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutopilotMode" AS ENUM ('MANUAL', 'SEMI_AUTOMATIC', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SHOPEE', 'TIKTOK_SHOP', 'MERCADO_LIVRE', 'AMAZON', 'ALIEXPRESS', 'MAGALU', 'META', 'INSTAGRAM', 'OUTRAS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "source" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "categoryId" TEXT,
    "imageUrl" TEXT,
    "productUrl" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "originalPrice" DECIMAL(12,2),
    "discountPercent" DECIMAL(5,2),
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER DEFAULT 0,
    "soldCount" INTEGER DEFAULT 0,
    "commissionPercent" DECIMAL(5,2),
    "commissionValue" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sources" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "affiliateUrl" TEXT,
    "storeName" TEXT,
    "rawData" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_scores" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ratingScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "salesScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "commissionScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "priceScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "trendScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "conversionScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalScore" DECIMAL(5,2) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "channel" "Channel" NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "subId" TEXT,
    "shortCode" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" TEXT NOT NULL,
    "affiliateLinkId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_products" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "campaignId" TEXT,
    "type" "ContentType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "caption" TEXT,
    "hashtags" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "type" "ContentType" NOT NULL,
    "template" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "externalPostId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autopilot_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mode" "AutopilotMode" NOT NULL DEFAULT 'SEMI_AUTOMATIC',
    "minScore" DECIMAL(5,2),
    "minDiscount" DECIMAL(5,2),
    "minRating" DECIMAL(3,2),
    "minCommission" DECIMAL(5,2),
    "minSales" INTEGER,
    "maxPrice" DECIMAL(12,2),
    "minPrice" DECIMAL(12,2),
    "allowedCategoryIds" JSONB,
    "blockedCategoryIds" JSONB,
    "maxPublicationsPerDay" INTEGER DEFAULT 10,
    "targetCampaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autopilot_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "scope" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "label" TEXT,
    "encryptedPayload" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "products_source_externalId_key" ON "products"("source", "externalId");

-- CreateIndex
CREATE INDEX "product_sources_productId_idx" ON "product_sources"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_sources_platform_externalId_key" ON "product_sources"("platform", "externalId");

-- CreateIndex
CREATE INDEX "product_scores_productId_idx" ON "product_scores"("productId");

-- CreateIndex
CREATE INDEX "product_scores_totalScore_idx" ON "product_scores"("totalScore");

-- CreateIndex
CREATE INDEX "opportunities_productId_idx" ON "opportunities"("productId");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_shortCode_key" ON "affiliate_links"("shortCode");

-- CreateIndex
CREATE INDEX "affiliate_links_productId_idx" ON "affiliate_links"("productId");

-- CreateIndex
CREATE INDEX "affiliate_links_shortCode_idx" ON "affiliate_links"("shortCode");

-- CreateIndex
CREATE INDEX "clicks_affiliateLinkId_idx" ON "clicks"("affiliateLinkId");

-- CreateIndex
CREATE INDEX "clicks_createdAt_idx" ON "clicks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_products_campaignId_productId_key" ON "campaign_products"("campaignId", "productId");

-- CreateIndex
CREATE INDEX "contents_productId_idx" ON "contents"("productId");

-- CreateIndex
CREATE INDEX "contents_campaignId_idx" ON "contents"("campaignId");

-- CreateIndex
CREATE INDEX "publications_contentId_idx" ON "publications"("contentId");

-- CreateIndex
CREATE INDEX "publications_status_idx" ON "publications"("status");

-- CreateIndex
CREATE INDEX "publications_scheduledAt_idx" ON "publications"("scheduledAt");

-- CreateIndex
CREATE INDEX "jobs_queue_idx" ON "jobs"("queue");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "logs_scope_idx" ON "logs"("scope");

-- CreateIndex
CREATE INDEX "logs_level_idx" ON "logs"("level");

-- CreateIndex
CREATE INDEX "logs_createdAt_idx" ON "logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_provider_label_key" ON "integration_credentials"("provider", "label");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_scores" ADD CONSTRAINT "product_scores_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_affiliateLinkId_fkey" FOREIGN KEY ("affiliateLinkId") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
