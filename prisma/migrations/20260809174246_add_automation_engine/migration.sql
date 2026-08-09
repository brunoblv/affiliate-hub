-- AlterEnum
ALTER TYPE "ProjectType" ADD VALUE 'MUSICA';

-- AlterTable
ALTER TABLE "project_channels" ADD COLUMN "externalPageId" TEXT;
ALTER TABLE "project_channels" ADD COLUMN "allowOffers" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "project_channels" ADD COLUMN "allowLinks" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "project_channels" ADD COLUMN "cooldownDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "project_channels" ADD COLUMN "lastPublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "publications" ADD COLUMN "projectChannelId" TEXT;
ALTER TABLE "publications" ADD COLUMN "assisted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "publications_projectChannelId_idx" ON "publications"("projectChannelId");

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_projectChannelId_fkey" FOREIGN KEY ("projectChannelId") REFERENCES "project_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_projectId_idx" ON "blog_posts"("projectId");
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");
CREATE INDEX "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "affiliate_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BlocklistType" AS ENUM ('SELLER', 'CATEGORY', 'KEYWORD');

-- CreateTable
CREATE TABLE "blocklist" (
    "id" TEXT NOT NULL,
    "type" "BlocklistType" NOT NULL,
    "value" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocklist_type_value_key" ON "blocklist"("type", "value");
