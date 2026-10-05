CREATE TABLE "social_tokens" (
  "id" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "refreshedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "social_tokens_pkey" PRIMARY KEY ("id")
);
