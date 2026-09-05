-- Continuação de 20260905112106_regras_postagem_facebook: aqui já pode usar
-- os valores do enum "ContentType", comitados na migração anterior (transação
-- separada). Idempotente pelos mesmos motivos.

-- AlterTable: contentType nasce nullable pra dar tempo do backfill abaixo
ALTER TABLE "publicacoes" ADD COLUMN IF NOT EXISTS "contentType" "ContentType";

-- AlterTable: campos de Insights (regra 5), preenchidos depois por job de sincronização
ALTER TABLE "publicacoes" ADD COLUMN IF NOT EXISTS "visualizacoes" INTEGER;
ALTER TABLE "publicacoes" ADD COLUMN IF NOT EXISTS "visualizadoresUnicos" INTEGER;
ALTER TABLE "publicacoes" ADD COLUMN IF NOT EXISTS "engajamentos" INTEGER;
ALTER TABLE "publicacoes" ADD COLUMN IF NOT EXISTS "insightsSincronizadoEm" TIMESTAMP(3);

-- Backfill a partir da origem de cada Publicacao já existente (idempotente: só reafirma valores)
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

-- AlterTable: agora sim, obrigatório (no-op se já estiver NOT NULL)
ALTER TABLE "publicacoes" ALTER COLUMN "contentType" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "publicacoes_canalId_contentType_agendadaPara_idx" ON "publicacoes"("canalId", "contentType", "agendadaPara");
CREATE INDEX IF NOT EXISTS "publicacoes_contentType_publicadaEm_idx" ON "publicacoes"("contentType", "publicadaEm");
