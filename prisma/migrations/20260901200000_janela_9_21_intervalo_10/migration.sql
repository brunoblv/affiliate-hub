-- AlterTable
ALTER TABLE "canais" ALTER COLUMN "intervaloMinimoMin" SET DEFAULT 10;
ALTER TABLE "canais" ALTER COLUMN "tetoDiario" SET DEFAULT 73;

-- Canais existentes: 10 min das 9h às 21h (Brasília) = 73 vagas/dia.
UPDATE "canais" SET "intervaloMinimoMin" = 10, "tetoDiario" = 73;
