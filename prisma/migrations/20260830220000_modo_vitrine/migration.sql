-- CreateEnum
CREATE TYPE "ModoProjeto" AS ENUM ('NORMAL', 'VITRINE');

-- CreateEnum
CREATE TYPE "FaixaPreco" AS ENUM ('ACESSIVEL', 'INTERMEDIARIO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SeloLanding" AS ENUM ('MAIOR_DESCONTO', 'MAIS_VENDIDO', 'ACHADINHO_DO_DIA', 'ULTIMAS_UNIDADES');

-- CreateEnum
CREATE TYPE "StatusLanding" AS ENUM ('RASCUNHO', 'PUBLICADA', 'FALHOU');

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN "destaqueVitrine" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "configuracoes_vitrine" (
    "destino" "Destino" NOT NULL,
    "modo" "ModoProjeto" NOT NULL DEFAULT 'NORMAL',
    "descontoMinimoPct" INTEGER NOT NULL DEFAULT 20,
    "tetoAcessivel" DECIMAL(12,2) NOT NULL DEFAULT 50,
    "tetoIntermediario" DECIMAL(12,2) NOT NULL DEFAULT 150,
    "cotaAcessivelPct" INTEGER NOT NULL DEFAULT 40,
    "quantidadeItens" INTEGER NOT NULL DEFAULT 16,
    "maxPorCategoria" INTEGER NOT NULL DEFAULT 3,
    "linkGrupoWhatsapp" TEXT,
    "linkGrupoTelegram" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_vitrine_pkey" PRIMARY KEY ("destino")
);

-- CreateTable
CREATE TABLE "landings_diarias" (
    "id" TEXT NOT NULL,
    "destino" "Destino" NOT NULL,
    "data" DATE NOT NULL,
    "slug" TEXT NOT NULL,
    "heroProdutoId" TEXT,
    "headline" TEXT,
    "metaTitulo" TEXT NOT NULL,
    "metaDescricao" TEXT NOT NULL,
    "status" "StatusLanding" NOT NULL DEFAULT 'RASCUNHO',
    "textosViaGemini" BOOLEAN NOT NULL DEFAULT false,
    "geradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landings_diarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_produtos" (
    "id" TEXT NOT NULL,
    "landingDiariaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL,
    "faixaPreco" "FaixaPreco" NOT NULL,
    "selo" "SeloLanding",
    "tituloCurto" TEXT,
    "descricao" TEXT,

    CONSTRAINT "landing_produtos_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "publicacoes" ADD COLUMN "landingDiariaId" TEXT;

-- DropCheckConstraint
ALTER TABLE "publicacoes" DROP CONSTRAINT "publicacoes_produto_ou_post_check";

-- AddCheckConstraint: exatamente um de produtoId / postId / landingDiariaId.
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_produto_ou_post_ou_landing_check"
  CHECK (
    ("produtoId" IS NOT NULL AND "postId" IS NULL AND "landingDiariaId" IS NULL)
    OR ("produtoId" IS NULL AND "postId" IS NOT NULL AND "landingDiariaId" IS NULL)
    OR ("produtoId" IS NULL AND "postId" IS NULL AND "landingDiariaId" IS NOT NULL)
  );

-- CreateIndex
CREATE UNIQUE INDEX "landings_diarias_slug_key" ON "landings_diarias"("slug");

-- CreateIndex
CREATE INDEX "landings_diarias_destino_status_idx" ON "landings_diarias"("destino", "status");

-- CreateIndex
CREATE UNIQUE INDEX "landings_diarias_destino_data_key" ON "landings_diarias"("destino", "data");

-- CreateIndex
CREATE UNIQUE INDEX "landing_produtos_landingDiariaId_produtoId_key" ON "landing_produtos"("landingDiariaId", "produtoId");

-- CreateIndex
CREATE INDEX "landing_produtos_landingDiariaId_posicao_idx" ON "landing_produtos"("landingDiariaId", "posicao");

-- CreateIndex
CREATE INDEX "publicacoes_landingDiariaId_canalId_publicadaEm_idx" ON "publicacoes"("landingDiariaId", "canalId", "publicadaEm");

-- AddForeignKey
ALTER TABLE "landings_diarias" ADD CONSTRAINT "landings_diarias_heroProdutoId_fkey" FOREIGN KEY ("heroProdutoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_produtos" ADD CONSTRAINT "landing_produtos_landingDiariaId_fkey" FOREIGN KEY ("landingDiariaId") REFERENCES "landings_diarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_produtos" ADD CONSTRAINT "landing_produtos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_landingDiariaId_fkey" FOREIGN KEY ("landingDiariaId") REFERENCES "landings_diarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
