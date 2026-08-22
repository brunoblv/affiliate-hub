-- Novo enum Destino: site/grupos para onde o produto é divulgado,
-- independente da Plataforma (a loja de origem).
CREATE TYPE "Destino" AS ENUM ('MEU_NOVO_LAR', 'TIKTOK_SHOP', 'UMBANDA');

-- Novas redes: grupo do Facebook e WhatsApp.
ALTER TYPE "Rede" ADD VALUE 'FACEBOOK_GROUP';
ALTER TYPE "Rede" ADD VALUE 'WHATSAPP';

ALTER TABLE "produtos" ADD COLUMN "destino" "Destino" NOT NULL DEFAULT 'MEU_NOVO_LAR';
ALTER TABLE "canais" ADD COLUMN "destino" "Destino" NOT NULL DEFAULT 'MEU_NOVO_LAR';

CREATE INDEX "produtos_destino_idx" ON "produtos"("destino");
CREATE INDEX "canais_destino_idx" ON "canais"("destino");
