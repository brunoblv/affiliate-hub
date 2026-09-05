-- Só cria o enum e os valores novos — nada aqui USA "ContentType" ainda.
-- Postgres proíbe usar um valor de enum na mesma transação em que ele foi
-- adicionado (erro 55P04, "unsafe use of new value"), e o Prisma roda cada
-- migration.sql como uma transação só. Por isso o uso (ADD COLUMN/UPDATE em
-- publicacoes) fica na migração seguinte, que já enxerga estes valores
-- comitados. Idempotente: seguro rodar de novo não importa em que ponto
-- uma tentativa anterior tenha parado.

-- AlterEnum
ALTER TYPE "NivelLog" ADD VALUE IF NOT EXISTS 'ALERTA';

-- CreateEnum: nasce vazio, labels entram via ADD VALUE IF NOT EXISTS.
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
-- Não usa o enum ContentType, então pode ficar nesta mesma migração.
ALTER TABLE "canais" ADD COLUMN IF NOT EXISTS "tetoOfertaIndividualDiario" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "canais" ADD COLUMN IF NOT EXISTS "linkEmComentario" BOOLEAN NOT NULL DEFAULT false;
