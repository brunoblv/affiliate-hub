-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Categoria" ADD VALUE 'TAROT';
ALTER TYPE "Categoria" ADD VALUE 'PEDRAS_CRISTAIS';
ALTER TYPE "Categoria" ADD VALUE 'VELAS';
ALTER TYPE "Categoria" ADD VALUE 'INCENSOS';
ALTER TYPE "Categoria" ADD VALUE 'LIVROS_ESPIRITUALIDADE';
ALTER TYPE "Categoria" ADD VALUE 'ITENS_ALTAR';
ALTER TYPE "Categoria" ADD VALUE 'JAPAMALAS';
ALTER TYPE "Categoria" ADD VALUE 'DECORACAO_ESPIRITUAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CategoriaEditorial" ADD VALUE 'JORNADA_ESPIRITUAL';
ALTER TYPE "CategoriaEditorial" ADD VALUE 'REFLEXAO_ESPIRITUAL';
ALTER TYPE "CategoriaEditorial" ADD VALUE 'GUIA_ESPIRITUALIDADE';

-- AlterEnum
ALTER TYPE "Destino" ADD VALUE 'MAGO_MEIA_NOITE';

-- CreateTable
CREATE TABLE "guias" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "ctaTitulo" TEXT NOT NULL,
    "ctaSubtitulo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guia_produtos" (
    "id" TEXT NOT NULL,
    "guiaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "melhorPara" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "pro" TEXT NOT NULL,
    "contra" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "guia_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "guiaId" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guias_postId_key" ON "guias"("postId");

-- CreateIndex
CREATE INDEX "guia_produtos_guiaId_ordem_idx" ON "guia_produtos"("guiaId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "guia_produtos_guiaId_produtoId_key" ON "guia_produtos"("guiaId", "produtoId");

-- CreateIndex
CREATE INDEX "faqs_guiaId_ordem_idx" ON "faqs"("guiaId", "ordem");

-- AddForeignKey
ALTER TABLE "guias" ADD CONSTRAINT "guias_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guia_produtos" ADD CONSTRAINT "guia_produtos_guiaId_fkey" FOREIGN KEY ("guiaId") REFERENCES "guias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guia_produtos" ADD CONSTRAINT "guia_produtos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_guiaId_fkey" FOREIGN KEY ("guiaId") REFERENCES "guias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
