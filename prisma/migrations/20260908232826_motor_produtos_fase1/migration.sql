-- CreateEnum
CREATE TYPE "SegmentoProduto" AS ENUM ('VENDE_BEM', 'VENDE_BEM_DESCONTO', 'POTENCIAL', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "TipoOfertaShopee" AS ENUM ('OFERTA_PRODUTO', 'OFERTA_LOJA', 'OFERTA_GERAL');

-- AlterTable
ALTER TABLE "configuracoes" ADD COLUMN     "motorDescontoMinimoPct" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "motorPercentilVendeBem" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "motorPesoComissao" DECIMAL(4,2) NOT NULL DEFAULT 1,
ADD COLUMN     "motorPesoDesconto" DECIMAL(4,2) NOT NULL DEFAULT 1,
ADD COLUMN     "motorPesoVendas" DECIMAL(4,2) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "comissaoEstimada" DECIMAL(12,2),
ADD COLUMN     "descontoPct" INTEGER,
ADD COLUMN     "motivoSegmento" JSONB,
ADD COLUMN     "pontuacao" DECIMAL(8,3),
ADD COLUMN     "segmentadoEm" TIMESTAMP(3),
ADD COLUMN     "segmento" "SegmentoProduto",
ADD COLUMN     "taxaComissao" DECIMAL(5,2),
ADD COLUMN     "tipoOferta" "TipoOfertaShopee",
ADD COLUMN     "vendas" INTEGER;

-- CreateTable
CREATE TABLE "produto_venda_snapshots" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "vendas" INTEGER NOT NULL,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produto_venda_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produto_venda_snapshots_produtoId_registradoEm_idx" ON "produto_venda_snapshots"("produtoId", "registradoEm");

-- CreateIndex
CREATE INDEX "produtos_segmento_idx" ON "produtos"("segmento");

-- CreateIndex
CREATE INDEX "produtos_plataforma_categoria_segmento_idx" ON "produtos"("plataforma", "categoria", "segmento");

-- AddForeignKey
ALTER TABLE "produto_venda_snapshots" ADD CONSTRAINT "produto_venda_snapshots_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
