-- AlterEnum
ALTER TYPE "NivelLog" ADD VALUE 'ALERTA';

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('OFERTA_INDIVIDUAL', 'SELECAO', 'CONTEUDO_BLOG', 'NARRATIVA_PESSOAL');

-- AlterTable: novos limites/flag do canal (regras 1 e 4 de docs/hub/regras-postagem-facebook.md)
ALTER TABLE "canais" ADD COLUMN "tetoOfertaIndividualDiario" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "canais" ADD COLUMN "linkEmComentario" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: contentType nasce nullable pra dar tempo do backfill abaixo
ALTER TABLE "publicacoes" ADD COLUMN "contentType" "ContentType";

-- AlterTable: campos de Insights (regra 5), preenchidos depois por job de sincronização
ALTER TABLE "publicacoes" ADD COLUMN "visualizacoes" INTEGER;
ALTER TABLE "publicacoes" ADD COLUMN "visualizadoresUnicos" INTEGER;
ALTER TABLE "publicacoes" ADD COLUMN "engajamentos" INTEGER;
ALTER TABLE "publicacoes" ADD COLUMN "insightsSincronizadoEm" TIMESTAMP(3);

-- Backfill a partir da origem de cada Publicacao já existente
UPDATE "publicacoes"
SET "contentType" = 'OFERTA_INDIVIDUAL'
WHERE "produtoId" IS NOT NULL;

UPDATE "publicacoes" p
SET "contentType" = 'SELECAO'
FROM "posts" po
WHERE p."postId" = po."id" AND po."tipo" = 'LISTA';

UPDATE "publicacoes" p
SET "contentType" = 'NARRATIVA_PESSOAL'
FROM "posts" po
WHERE p."postId" = po."id" AND po."tipo" = 'JORNADA' AND po."categoriaEditorial" = 'JORNADA_APARTAMENTO';

UPDATE "publicacoes" p
SET "contentType" = 'CONTEUDO_BLOG'
FROM "posts" po
WHERE p."postId" = po."id" AND po."tipo" = 'JORNADA'
  AND (po."categoriaEditorial" IS NULL OR po."categoriaEditorial" = 'DICAS_CASA');

UPDATE "publicacoes"
SET "contentType" = 'SELECAO'
WHERE "landingDiariaId" IS NOT NULL;

-- Segurança: qualquer linha órfã que não bateu em nenhum caso acima
UPDATE "publicacoes"
SET "contentType" = 'OFERTA_INDIVIDUAL'
WHERE "contentType" IS NULL;

-- AlterTable: agora sim, obrigatório
ALTER TABLE "publicacoes" ALTER COLUMN "contentType" SET NOT NULL;

-- CreateIndex
CREATE INDEX "publicacoes_canalId_contentType_agendadaPara_idx" ON "publicacoes"("canalId", "contentType", "agendadaPara");
CREATE INDEX "publicacoes_contentType_publicadaEm_idx" ON "publicacoes"("contentType", "publicadaEm");
