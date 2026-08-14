-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TipoPost" AS ENUM ('JORNADA', 'PRODUTO', 'LISTA');

-- CreateEnum
CREATE TYPE "StatusPost" AS ENUM ('RASCUNHO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "Plataforma" AS ENUM ('MERCADO_LIVRE', 'AMAZON', 'SHOPEE', 'OUTRA');

-- CreateEnum
CREATE TYPE "Rede" AS ENUM ('FACEBOOK_PAGE', 'INSTAGRAM', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "StatusPublicacao" AS ENUM ('PENDENTE', 'PUBLICANDO', 'PUBLICADA', 'FALHOU', 'CANCELADA');

-- CreateEnum
CREATE TYPE "NivelLog" AS ENUM ('INFO', 'ERRO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "itens_de_post" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "rotulo" TEXT,
    "nota" TEXT,

    CONSTRAINT "itens_de_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "midias_em_posts" (
    "postId" TEXT NOT NULL,
    "midiaId" TEXT NOT NULL,

    CONSTRAINT "midias_em_posts_pkey" PRIMARY KEY ("postId","midiaId")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "historico_precos" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_precos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "credenciais" (
    "id" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credenciais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliques" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "origem" TEXT,
    "visitante" TEXT,
    "referer" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinantes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tokenBaixa" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baixaEm" TIMESTAMP(3),

    CONSTRAINT "assinantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_status_publicadoEm_idx" ON "posts"("status", "publicadoEm");

-- CreateIndex
CREATE INDEX "posts_tipo_idx" ON "posts"("tipo");

-- CreateIndex
CREATE INDEX "itens_de_post_postId_ordem_idx" ON "itens_de_post"("postId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "itens_de_post_postId_produtoId_key" ON "itens_de_post"("postId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "midias_url_key" ON "midias"("url");

-- CreateIndex
CREATE INDEX "midias_criadoEm_idx" ON "midias"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_slug_key" ON "produtos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigoCurto_key" ON "produtos"("codigoCurto");

-- CreateIndex
CREATE INDEX "produtos_ativo_idx" ON "produtos"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_plataforma_idExterno_key" ON "produtos"("plataforma", "idExterno");

-- CreateIndex
CREATE INDEX "historico_precos_produtoId_registradoEm_idx" ON "historico_precos"("produtoId", "registradoEm");

-- CreateIndex
CREATE INDEX "canais_ativo_idx" ON "canais"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "canais_rede_idExterno_key" ON "canais"("rede", "idExterno");

-- CreateIndex
CREATE UNIQUE INDEX "publicacoes_chaveIdempotencia_key" ON "publicacoes"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "publicacoes_status_agendadaPara_idx" ON "publicacoes"("status", "agendadaPara");

-- CreateIndex
CREATE INDEX "publicacoes_canalId_agendadaPara_idx" ON "publicacoes"("canalId", "agendadaPara");

-- CreateIndex
CREATE INDEX "publicacoes_produtoId_canalId_publicadaEm_idx" ON "publicacoes"("produtoId", "canalId", "publicadaEm");

-- CreateIndex
CREATE UNIQUE INDEX "credenciais_provedor_key" ON "credenciais"("provedor");

-- CreateIndex
CREATE INDEX "cliques_produtoId_criadoEm_idx" ON "cliques"("produtoId", "criadoEm");

-- CreateIndex
CREATE INDEX "cliques_origem_criadoEm_idx" ON "cliques"("origem", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "assinantes_email_key" ON "assinantes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assinantes_tokenBaixa_key" ON "assinantes"("tokenBaixa");

-- CreateIndex
CREATE INDEX "logs_criadoEm_idx" ON "logs"("criadoEm");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_de_post" ADD CONSTRAINT "itens_de_post_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_de_post" ADD CONSTRAINT "itens_de_post_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "midias_em_posts" ADD CONSTRAINT "midias_em_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "midias_em_posts" ADD CONSTRAINT "midias_em_posts_midiaId_fkey" FOREIGN KEY ("midiaId") REFERENCES "midias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliques" ADD CONSTRAINT "cliques_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
