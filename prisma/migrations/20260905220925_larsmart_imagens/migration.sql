-- CreateEnum
CREATE TYPE "TipoImagemLarSmart" AS ENUM ('CAPA', 'PRODUTO');

-- CreateTable
CREATE TABLE "imagens_larsmart" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "midiaId" TEXT NOT NULL,
    "produtoId" TEXT,
    "tipo" "TipoImagemLarSmart" NOT NULL,
    "prompt" TEXT NOT NULL,
    "pinterestTitulo" TEXT,
    "pinterestDescricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagens_larsmart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imagens_larsmart_postId_produtoId_tipo_key" ON "imagens_larsmart"("postId", "produtoId", "tipo");

-- AddForeignKey
ALTER TABLE "imagens_larsmart" ADD CONSTRAINT "imagens_larsmart_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagens_larsmart" ADD CONSTRAINT "imagens_larsmart_midiaId_fkey" FOREIGN KEY ("midiaId") REFERENCES "midias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagens_larsmart" ADD CONSTRAINT "imagens_larsmart_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
