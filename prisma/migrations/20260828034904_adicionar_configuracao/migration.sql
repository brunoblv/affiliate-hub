-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "shopeeDescobertaLimiteDiario" INTEGER NOT NULL DEFAULT 15,
    "shopeeComissaoMinimaPct" INTEGER NOT NULL DEFAULT 10,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);
