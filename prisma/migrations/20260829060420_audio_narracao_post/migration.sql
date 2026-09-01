-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "audioId" TEXT;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
