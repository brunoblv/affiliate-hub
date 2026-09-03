-- CreateTable
CREATE TABLE "links_afiliado_etiquetados" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_afiliado_etiquetados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "links_afiliado_etiquetados_produtoId_chave_key" ON "links_afiliado_etiquetados"("produtoId", "chave");

-- CreateIndex
CREATE INDEX "links_afiliado_etiquetados_produtoId_idx" ON "links_afiliado_etiquetados"("produtoId");

-- AddForeignKey
ALTER TABLE "links_afiliado_etiquetados" ADD CONSTRAINT "links_afiliado_etiquetados_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
