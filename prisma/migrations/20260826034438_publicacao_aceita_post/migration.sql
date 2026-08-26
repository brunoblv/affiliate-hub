-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "destino" "Destino" NOT NULL DEFAULT 'MEU_NOVO_LAR';

-- AlterTable
ALTER TABLE "publicacoes" ADD COLUMN     "postId" TEXT,
ALTER COLUMN "produtoId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "publicacoes_postId_canalId_publicadaEm_idx" ON "publicacoes"("postId", "canalId", "publicadaEm");

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: exatamente um de produtoId/postId preenchido, nunca os dois nem nenhum.
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_produto_ou_post_check"
  CHECK (("produtoId" IS NOT NULL AND "postId" IS NULL) OR ("produtoId" IS NULL AND "postId" IS NOT NULL));
