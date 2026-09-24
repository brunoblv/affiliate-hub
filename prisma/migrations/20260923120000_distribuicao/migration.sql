CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENDING', 'SENT', 'FAILED', 'UNCERTAIN', 'CANCELED');

CREATE TABLE "publications" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "creativeId" TEXT,
  "contentType" TEXT NOT NULL DEFAULT 'oferta_individual',
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "priceObservedAt" TIMESTAMP(3) NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledFor" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "externalId" TEXT,
  "error" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publication_attempts" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "status" "PublicationStatus" NOT NULL,
  "detail" TEXT,
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publication_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publications_status_scheduledFor_idx" ON "publications"("status", "scheduledFor");
CREATE INDEX "publications_targetId_scheduledFor_idx" ON "publications"("targetId", "scheduledFor");
CREATE INDEX "publications_productId_createdAt_idx" ON "publications"("productId", "createdAt");
CREATE INDEX "publication_attempts_publicationId_createdAt_idx" ON "publication_attempts"("publicationId", "createdAt");
ALTER TABLE "publications" ADD CONSTRAINT "publications_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publications" ADD CONSTRAINT "publications_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publication_attempts" ADD CONSTRAINT "publication_attempts_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defesa adicional além da reserva serializada pelo worker.
CREATE UNIQUE INDEX "publications_one_sending_per_target" ON "publications"("targetId") WHERE status = 'SENDING';
