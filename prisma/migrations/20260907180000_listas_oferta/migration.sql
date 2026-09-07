-- Listas pré-feitas da loja (Shopee Oferta Shopee, coleção ML, etc.)
-- e origem extra em Publicacao/Clique.

CREATE TABLE "listas_oferta" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "plataforma" "Plataforma" NOT NULL,
    "destino" "Destino" NOT NULL DEFAULT 'MEU_NOVO_LAR',
    "redes" JSONB NOT NULL DEFAULT '[]',
    "linkAfiliado" TEXT NOT NULL,
    "codigoCurto" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "divulgarDiario" BOOLEAN NOT NULL DEFAULT true,
    "textoPinterest" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listas_oferta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "listas_oferta_codigoCurto_key" ON "listas_oferta"("codigoCurto");
CREATE INDEX "listas_oferta_ativo_divulgarDiario_idx" ON "listas_oferta"("ativo", "divulgarDiario");
CREATE INDEX "listas_oferta_destino_idx" ON "listas_oferta"("destino");

ALTER TABLE "publicacoes" ADD COLUMN "listaOfertaId" TEXT;

ALTER TABLE "publicacoes" DROP CONSTRAINT "publicacoes_produto_ou_post_ou_landing_check";

ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_origem_unica_check"
  CHECK (
    ("produtoId" IS NOT NULL AND "postId" IS NULL AND "landingDiariaId" IS NULL AND "listaOfertaId" IS NULL)
    OR ("produtoId" IS NULL AND "postId" IS NOT NULL AND "landingDiariaId" IS NULL AND "listaOfertaId" IS NULL)
    OR ("produtoId" IS NULL AND "postId" IS NULL AND "landingDiariaId" IS NOT NULL AND "listaOfertaId" IS NULL)
    OR ("produtoId" IS NULL AND "postId" IS NULL AND "landingDiariaId" IS NULL AND "listaOfertaId" IS NOT NULL)
  );

CREATE INDEX "publicacoes_listaOfertaId_canalId_publicadaEm_idx" ON "publicacoes"("listaOfertaId", "canalId", "publicadaEm");

ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_listaOfertaId_fkey"
  FOREIGN KEY ("listaOfertaId") REFERENCES "listas_oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cliques" ALTER COLUMN "produtoId" DROP NOT NULL;
ALTER TABLE "cliques" ADD COLUMN "listaOfertaId" TEXT;

ALTER TABLE "cliques" ADD CONSTRAINT "cliques_produto_ou_lista_check"
  CHECK (
    ("produtoId" IS NOT NULL AND "listaOfertaId" IS NULL)
    OR ("produtoId" IS NULL AND "listaOfertaId" IS NOT NULL)
  );

CREATE INDEX "cliques_listaOfertaId_criadoEm_idx" ON "cliques"("listaOfertaId", "criadoEm");

ALTER TABLE "cliques" ADD CONSTRAINT "cliques_listaOfertaId_fkey"
  FOREIGN KEY ("listaOfertaId") REFERENCES "listas_oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
