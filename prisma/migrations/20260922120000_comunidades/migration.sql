CREATE TYPE "CommunityPlatform" AS ENUM ('WHATSAPP', 'TELEGRAM');
CREATE TYPE "CommunityKind" AS ENUM ('GROUP', 'CHANNEL');

CREATE TABLE "communities" (
  "id" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "platform" "CommunityPlatform" NOT NULL,
  "kind" "CommunityKind" NOT NULL,
  "inviteUrl" TEXT NOT NULL,
  "publicationId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_clicks" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_clicks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "communities_nicheId_active_position_idx" ON "communities"("nicheId", "active", "position");
CREATE INDEX "community_clicks_communityId_createdAt_idx" ON "community_clicks"("communityId", "createdAt");
CREATE INDEX "community_clicks_nicheId_createdAt_idx" ON "community_clicks"("nicheId", "createdAt");
ALTER TABLE "communities" ADD CONSTRAINT "communities_nicheId_fkey" FOREIGN KEY ("nicheId") REFERENCES "niches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_clicks" ADD CONSTRAINT "community_clicks_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
