-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Categoria" ADD VALUE 'CASA';
ALTER TYPE "Categoria" ADD VALUE 'ORGANIZACAO';
ALTER TYPE "Categoria" ADD VALUE 'BANHEIRO';
ALTER TYPE "Categoria" ADD VALUE 'LAVANDERIA';
ALTER TYPE "Categoria" ADD VALUE 'LIMPEZA';
ALTER TYPE "Categoria" ADD VALUE 'DECORACAO';
ALTER TYPE "Categoria" ADD VALUE 'ILUMINACAO';
ALTER TYPE "Categoria" ADD VALUE 'MOVEIS';
ALTER TYPE "Categoria" ADD VALUE 'FERRAMENTAS';
ALTER TYPE "Categoria" ADD VALUE 'JARDIM';
ALTER TYPE "Categoria" ADD VALUE 'ELETRODOMESTICOS';
