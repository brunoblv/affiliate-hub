-- Aplica só o que falta da migration 20260814220151_init_v2 numa base que já
-- tem o schema v1 (users/accounts/sessions/UserRole idênticos, preservados;
-- logs v1 renomeada pra abrir espaço pra tabela nova do v2).
BEGIN;

ALTER TABLE "logs" RENAME TO "logs_v1_bak";
ALTER TABLE "logs_v1_bak" RENAME CONSTRAINT "logs_pkey" TO "logs_v1_bak_pkey";

-- CreateEnum
CREATE TYPE "TipoPost" AS ENUM ('JORNADA', 'PRODUTO', 'LISTA');
CREATE TYPE "StatusPost" AS ENUM ('RASCUNHO', 'PUBLICADO');
CREATE TYPE "Plataforma" AS ENUM ('MERCADO_LIVRE', 'AMAZON', 'SHOPEE', 'OUTRA');
CREATE TYPE "Rede" AS ENUM ('FACEBOOK_PAGE', 'INSTAGRAM', 'TELEGRAM');
CREATE TYPE "StatusPublicacao" AS ENUM ('PENDENTE', 'PUBLICANDO', 'PUBLICADA', 'FALHOU', 'CANCELADA');
CREATE TYPE "NivelLog" AS ENUM ('INFO', 'ERRO');

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPost" NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "resumo" TEXT,
    "corpo" TEXT NOT NULL,
    "capaId" TEXT,
    "seoTitulo" TEXT,
    "metaDescricao" TEXT,
    "status" "StatusPost" NOT NULL DEFAULT 'RASCUNHO',
    "publicadoEm" TIMESTAMP(3),
    "autorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "itens_de_post" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "rotulo" TEXT,
    "nota" TEXT,
    CONSTRAINT "itens_de_post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "midias" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "largura" INTEGER,
    "altura" INTEGER,
    "alt" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "midias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "midias_em_posts" (
    "postId" TEXT NOT NULL,
    "midiaId" TEXT NOT NULL,
    CONSTRAINT "midias_em_posts_pkey" PRIMARY KEY ("postId","midiaId")
);

CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "plataforma" "Plataforma" NOT NULL,
    "idExterno" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "imagens" JSONB NOT NULL DEFAULT '[]',
    "precoAtual" DECIMAL(12,2) NOT NULL,
    "precoOriginal" DECIMAL(12,2),
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "linkAfiliado" TEXT NOT NULL,
    "codigoCurto" TEXT NOT NULL,
    "dadosBrutos" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sincronizadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "historico_precos" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historico_precos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "canais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "rede" "Rede" NOT NULL,
    "idExterno" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "horarios" JSONB NOT NULL DEFAULT '[]',
    "intervaloMinimoMin" INTEGER NOT NULL DEFAULT 90,
    "tetoDiario" INTEGER NOT NULL DEFAULT 6,
    "cooldownDias" INTEGER NOT NULL DEFAULT 30,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "canais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publicacoes" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "canalId" TEXT NOT NULL,
    "agendadaPara" TIMESTAMP(3) NOT NULL,
    "status" "StatusPublicacao" NOT NULL DEFAULT 'PENDENTE',
    "texto" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "linkDestino" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "idPostExterno" TEXT,
    "erro" TEXT,
    "publicadaEm" TIMESTAMP(3),
    "chaveIdempotencia" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "publicacoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credenciais" (
    "id" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credenciais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cliques" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "origem" TEXT,
    "visitante" TEXT,
    "referer" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cliques_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assinantes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tokenBaixa" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baixaEm" TIMESTAMP(3),
    CONSTRAINT "assinantes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "nivel" "NivelLog" NOT NULL,
    "area" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "contexto" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
CREATE INDEX "posts_status_publicadoEm_idx" ON "posts"("status", "publicadoEm");
CREATE INDEX "posts_tipo_idx" ON "posts"("tipo");
CREATE INDEX "itens_de_post_postId_ordem_idx" ON "itens_de_post"("postId", "ordem");
CREATE UNIQUE INDEX "itens_de_post_postId_produtoId_key" ON "itens_de_post"("postId", "produtoId");
CREATE UNIQUE INDEX "midias_url_key" ON "midias"("url");
CREATE INDEX "midias_criadoEm_idx" ON "midias"("criadoEm");
CREATE UNIQUE INDEX "produtos_slug_key" ON "produtos"("slug");
CREATE UNIQUE INDEX "produtos_codigoCurto_key" ON "produtos"("codigoCurto");
CREATE INDEX "produtos_ativo_idx" ON "produtos"("ativo");
CREATE UNIQUE INDEX "produtos_plataforma_idExterno_key" ON "produtos"("plataforma", "idExterno");
CREATE INDEX "historico_precos_produtoId_registradoEm_idx" ON "historico_precos"("produtoId", "registradoEm");
CREATE INDEX "canais_ativo_idx" ON "canais"("ativo");
CREATE UNIQUE INDEX "canais_rede_idExterno_key" ON "canais"("rede", "idExterno");
CREATE UNIQUE INDEX "publicacoes_chaveIdempotencia_key" ON "publicacoes"("chaveIdempotencia");
CREATE INDEX "publicacoes_status_agendadaPara_idx" ON "publicacoes"("status", "agendadaPara");
CREATE INDEX "publicacoes_canalId_agendadaPara_idx" ON "publicacoes"("canalId", "agendadaPara");
CREATE INDEX "publicacoes_produtoId_canalId_publicadaEm_idx" ON "publicacoes"("produtoId", "canalId", "publicadaEm");
CREATE UNIQUE INDEX "credenciais_provedor_key" ON "credenciais"("provedor");
CREATE INDEX "cliques_produtoId_criadoEm_idx" ON "cliques"("produtoId", "criadoEm");
CREATE INDEX "cliques_origem_criadoEm_idx" ON "cliques"("origem", "criadoEm");
CREATE UNIQUE INDEX "assinantes_email_key" ON "assinantes"("email");
CREATE UNIQUE INDEX "assinantes_tokenBaixa_key" ON "assinantes"("tokenBaixa");
CREATE INDEX "logs_criadoEm_idx" ON "logs"("criadoEm");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "itens_de_post" ADD CONSTRAINT "itens_de_post_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "itens_de_post" ADD CONSTRAINT "itens_de_post_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "midias_em_posts" ADD CONSTRAINT "midias_em_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "midias_em_posts" ADD CONSTRAINT "midias_em_posts_midiaId_fkey" FOREIGN KEY ("midiaId") REFERENCES "midias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cliques" ADD CONSTRAINT "cliques_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
