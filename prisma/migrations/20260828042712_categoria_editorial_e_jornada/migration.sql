-- CreateEnum
CREATE TYPE "CategoriaEditorial" AS ENUM ('DICAS_CASA', 'JORNADA_APARTAMENTO');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "categoriaEditorial" "CategoriaEditorial";

-- CreateTable
CREATE TABLE "notas_jornada" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_jornada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_tipo_categoriaEditorial_idx" ON "posts"("tipo", "categoriaEditorial");
