-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('HOME', 'UMBANDA');

-- CreateEnum
CREATE TYPE "ProjectChannelType" AS ENUM ('PUBLIC_PAGE', 'PUBLIC_GROUP', 'PRIVATE_GROUP', 'PROFILE');

-- CreateTable
CREATE TABLE "affiliate_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_projects_slug_key" ON "affiliate_projects"("slug");

-- CreateTable
CREATE TABLE "project_channels" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Channel" NOT NULL,
    "url" TEXT,
    "type" "ProjectChannelType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_channels_projectId_idx" ON "project_channels"("projectId");

-- AlterTable: add nullable projectId columns + Campaign.code first, backfill, then enforce NOT NULL.
ALTER TABLE "categories" ADD COLUMN "projectId" TEXT;
ALTER TABLE "products" ADD COLUMN "projectId" TEXT;
ALTER TABLE "campaigns" ADD COLUMN "projectId" TEXT;
ALTER TABLE "campaigns" ADD COLUMN "code" TEXT;
ALTER TABLE "campaigns" ADD COLUMN "channel" TEXT;
ALTER TABLE "contents" ADD COLUMN "projectId" TEXT;

-- Seed the two projects that pre-existing rows must be attached to.
INSERT INTO "affiliate_projects" ("id", "name", "slug", "type", "description", "active", "createdAt", "updatedAt")
VALUES
    ('cm_project_home', 'Meu Novo Lar', 'meu-novo-lar', 'HOME', 'Produtos de casa, reforma e organização.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cm_project_umbanda', 'Umbanda', 'umbanda', 'UMBANDA', 'Produtos relacionados à Umbanda e espiritualidade.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill all pre-existing rows into the HOME project (Meu Novo Lar), the only project that existed before this migration.
UPDATE "categories" SET "projectId" = 'cm_project_home' WHERE "projectId" IS NULL;
UPDATE "products" SET "projectId" = 'cm_project_home' WHERE "projectId" IS NULL;
UPDATE "campaigns" SET "projectId" = 'cm_project_home' WHERE "projectId" IS NULL;
UPDATE "contents" SET "projectId" = 'cm_project_home' WHERE "projectId" IS NULL;

-- Enforce NOT NULL now that every row has a project.
ALTER TABLE "categories" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "campaigns" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "contents" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "categories_projectId_idx" ON "categories"("projectId");
CREATE INDEX "products_projectId_idx" ON "products"("projectId");
CREATE INDEX "campaigns_projectId_idx" ON "campaigns"("projectId");
CREATE INDEX "contents_projectId_idx" ON "contents"("projectId");
CREATE UNIQUE INDEX "campaigns_projectId_code_key" ON "campaigns"("projectId", "code");

-- AddForeignKey
ALTER TABLE "project_channels" ADD CONSTRAINT "project_channels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "affiliate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "affiliate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "affiliate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "affiliate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contents" ADD CONSTRAINT "contents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "affiliate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
