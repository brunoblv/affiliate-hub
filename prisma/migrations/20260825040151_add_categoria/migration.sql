-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('COZINHA', 'BELEZA', 'CASA_DECORACAO', 'ELETRONICOS', 'MODA', 'UMBANDA_RELIGIAO', 'PET', 'OUTRA');

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "categoria" "Categoria" NOT NULL DEFAULT 'OUTRA';

-- CreateIndex
CREATE INDEX "produtos_categoria_idx" ON "produtos"("categoria");
