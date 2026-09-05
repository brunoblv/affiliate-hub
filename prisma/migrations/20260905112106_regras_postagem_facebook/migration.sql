-- Idempotente de propósito: contém ALTER TYPE ... ADD VALUE, então o Prisma
-- roda este arquivo SEM transação (cada comando comita isolado). Se uma
-- tentativa anterior falhou no meio, os comandos já executados não podem dar
-- erro de "já existe" na re-execução — por isso todo CREATE/ALTER abaixo é
-- guardado.

-- AlterEnum
ALTER TYPE "NivelLog" ADD VALUE IF NOT EXISTS 'ALERTA';

-- CreateEnum: nasce vazio de propósito — os labels entram logo abaixo via
-- ADD VALUE IF NOT EXISTS, pra garantir que existem mesmo se uma tentativa
-- anterior já tiver criado o tipo (com ou sem os labels certos).
DO $$ BEGIN
    CREATE TYPE "ContentType" AS ENUM ();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'OFERTA_INDIVIDUAL';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'SELECAO';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'CONTEUDO_BLOG';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'NARRATIVA_PESSOAL';

-- AlterTable: novos limites/flag do canal (regras 1 e 4 de docs/hub/regras-postagem-facebook.md)
ALTER TABLE "canais" ADD COLUMN IF NOT EXISTS "tetoOfertaIndividualDiario" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "canais" ADD COLUMN IF NOT EXISTS "linkEmComentario" BOOLEAN NOT NULL DEFAULT false;

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
