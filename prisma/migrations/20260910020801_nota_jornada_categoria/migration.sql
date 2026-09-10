-- AlterTable
ALTER TABLE "notas_jornada" ADD COLUMN     "categoriaEditorial" "CategoriaEditorial";

-- CreateIndex
CREATE INDEX "notas_jornada_categoriaEditorial_idx" ON "notas_jornada"("categoriaEditorial");
