# Especificação — Affiliate Hub v2

> Reescrita enxuta do sistema. Substitui `especificacoes-sistema-afiliados.md` (1.668 linhas) e os 4 docs de `docs/`.
> Base: análise do código atual em `github.com/brunoblv/affiliate-hub` (40 models, 46 telas, 19.5k linhas).

---

## 1. O que o sistema é

Três camadas, uma dependendo da outra:

| Camada | O que é | Papel |
|---|---|---|
| **Conteúdo** | Blog público — posts da jornada de comprar o apartamento + páginas de produto | O destino. É onde o dinheiro acontece (AdSense + cliques de afiliado) |
| **Catálogo** | Produtos importados por ID da plataforma (Mercado Livre primeiro) | A matéria-prima dos posts e das publicações |
| **Distribuição** | Hub que publica nas redes em horários programados | O tráfego. Traz gente de fora para a camada de Conteúdo |

**Regra que organiza tudo:** a distribuição existe para alimentar o blog, não para substituí-lo.

## 2. Decisão central: para onde o post da rede social aponta

**Facebook Page e Instagram → link do blog.** Nunca o link de afiliado cru.

Motivos, em ordem de importância:

1. **AdSense.** O visitante que cai na página do produto no seu site vê anúncios. O que clica direto no Mercado Livre não vê nada. Você tem os dois modelos de receita — só o link do blog captura os dois.
2. **Alcance.** Meta reduz distribuição de posts com link de afiliado direto e repetido. Domínio próprio com conteúdo real não sofre o mesmo tratamento.
3. **Controle.** Produto saiu do ar ou mudou de preço? Você edita a página. O post no Facebook de três semanas atrás continua funcionando.

**Telegram e WhatsApp → link de afiliado direto** (via `/go/:code`, para rastrear). Nesses canais o público é de ofertas e espera o link curto; um intermediário só derruba a conversão.

Isso exige que **todo produto publicado tenha uma página no blog** — o que já é verdade no código atual (`app/(site)/produtos/[slug]/page.tsx`).

## 3. Correção da recomendação anterior

Na primeira análise, sem saber do blog, sugeri eliminar `BlogPost`, `BlogPostProduct` e `NewsletterSubscriber`. **Estava errado.** Essas três tabelas são o núcleo do produto, não periferia. Ficam.

O que continua fora está no §9.

---

## 4. Modelo de domínio

Oito tabelas. O schema atual tem 40.

```prisma
// ---------- CONTEÚDO ----------

model Post {
  id       String  @id @default(cuid())
  tipo     TipoPost              // JORNADA | PRODUTO | LISTA
  titulo   String
  slug     String  @unique
  resumo   String?
  corpo    String  @db.Text      // markdown
  capaUrl  String?

  seoTitulo    String?
  metaDescricao String?

  status      StatusPost @default(RASCUNHO)
  publicadoEm DateTime?

  produtos ItemDePost[]

  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  @@index([status, publicadoEm])
  @@map("posts")
}

enum TipoPost {
  JORNADA   // "Como escolhemos o sofá", "Orçamento da cozinha" — editorial, sem produto obrigatório
  PRODUTO   // Página de um produto só
  LISTA     // Roundup: "10 itens para o primeiro apartamento"
}

enum StatusPost { RASCUNHO PUBLICADO }

/** Produto dentro de um post LISTA ou PRODUTO, na ordem em que aparece. */
model ItemDePost {
  id        String  @id @default(cuid())
  postId    String
  produtoId String
  ordem     Int     @default(0)
  rotulo    String?              // "1. Sofá retrátil"
  nota      String? @db.Text     // por que esse, em 1-2 frases

  post    Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  produto Produto @relation(fields: [produtoId], references: [id], onDelete: Cascade)

  @@unique([postId, produtoId])
  @@index([postId, ordem])
  @@map("itens_de_post")
}

// ---------- CATÁLOGO ----------

model Produto {
  id           String   @id @default(cuid())
  plataforma   Plataforma
  idExterno    String              // MLB1234567890
  slug         String   @unique

  nome         String
  descricao    String?  @db.Text
  imagens      Json                // string[] — até 6 urls
  precoAtual   Decimal  @db.Decimal(12,2)
  precoOriginal Decimal? @db.Decimal(12,2)
  moeda        String   @default("BRL")

  linkAfiliado String              // colado por você
  codigoCurto  String   @unique    // /go/:codigo
  dadosBrutos  Json                // resposta íntegra da API, para debug

  ativo         Boolean  @default(true)
  sincronizadoEm DateTime?

  itens        ItemDePost[]
  publicacoes  Publicacao[]
  cliques      Clique[]

  criadoEm DateTime @default(now())

  @@unique([plataforma, idExterno])
  @@index([ativo])
  @@map("produtos")
}

enum Plataforma { MERCADO_LIVRE AMAZON SHOPEE OUTRA }

// ---------- DISTRIBUIÇÃO ----------

model Canal {
  id        String @id @default(cuid())
  nome      String                    // "Página Meu Novo Lar"
  rede      Rede
  idExterno String                    // page_id, chat_id, ig_user_id
  ativo     Boolean @default(true)

  /** ["09:00","13:00","19:30"] — fuso definido em TZ_APP, nunca o do servidor. */
  horarios       Json
  intervaloMinimoMin Int @default(90)
  /** Dias antes de o mesmo produto poder repetir neste canal. */
  cooldownDias   Int @default(30)

  publicacoes Publicacao[]

  @@map("canais")
}

enum Rede { FACEBOOK_PAGE INSTAGRAM TELEGRAM }

model Publicacao {
  id        String @id @default(cuid())
  produtoId String
  canalId   String

  agendadaPara DateTime
  status       StatusPublicacao @default(PENDENTE)

  /** Texto renderizado no momento do agendamento — auditável e reeditável. */
  texto        String  @db.Text
  imagemUrl    String?
  /** Blog ou /go, conforme §2. */
  linkDestino  String

  tentativas   Int      @default(0)
  idPostExterno String?
  erro         String?  @db.Text
  publicadaEm  DateTime?

  /** Impede duplicata mesmo com dois workers: produto+canal+horário. */
  chaveIdempotencia String @unique

  produto Produto @relation(fields: [produtoId], references: [id], onDelete: Cascade)
  canal   Canal   @relation(fields: [canalId], references: [id], onDelete: Cascade)

  @@index([status, agendadaPara])
  @@map("publicacoes")
}

enum StatusPublicacao { PENDENTE PUBLICANDO PUBLICADA FALHOU CANCELADA }

// ---------- APOIO ----------

model Credencial {
  id        String @id @default(cuid())
  provedor  String @unique          // "mercado_livre" | "meta" | "telegram"
  payload   String @db.Text         // AES-256-GCM (lib/integrations/crypto.ts — manter como está)
  ativo     Boolean @default(true)
  atualizadoEm DateTime @updatedAt
  @@map("credenciais")
}

model Clique {
  id        String   @id @default(cuid())
  produtoId String
  origem    String?                 // "facebook" | "blog" | "telegram"
  ip        String?
  userAgent String?
  criadoEm  DateTime @default(now())

  produto Produto @relation(fields: [produtoId], references: [id], onDelete: Cascade)

  @@index([produtoId, criadoEm])
  @@map("cliques")
}

model Assinante {
  id        String @id @default(cuid())
  email     String @unique
  ativo     Boolean @default(true)
  tokenBaixa String @unique @default(cuid())
  criadoEm  DateTime @default(now())
  @@map("assinantes")
}
```

Fora dali: `User` do NextAuth (mantém como está — já funciona).

---

## 5. Fluxos

### 5.1 Cadastrar produto

1. Você cola **ID** (`MLB1234567890`) + **link de afiliado**.
2. `GET https://api.mercadolibre.com/items/{id}` → nome, preço, `original_price`, imagens (`pictures[]`).
3. Sistema gera `slug` e `codigoCurto`, salva `dadosBrutos`.
4. **Cria automaticamente um Post do tipo `PRODUTO`** em `RASCUNHO`, com o texto do template já preenchido.
5. Você revisa, escreve as 2-3 frases suas (é o que diferencia de scraper genérico e o que o AdSense exige) e publica.

Sem produto sem página. Sem página sem revisão humana.

### 5.2 Agendar distribuição

Ao publicar o Post, o sistema oferece: **"distribuir em N canais"**. Para cada canal ativo:

- calcula o próximo horário livre (§6);
- renderiza o texto pelo template do canal (`lib/content/product-post.ts` — já pronto, reaproveitar);
- resolve `linkDestino` conforme §2;
- cria `Publicacao` com `chaveIdempotencia = ${produtoId}:${canalId}:${agendadaPara.toISOString()}`.

Estado inicial: **`PENDENTE`, e `PENDENTE` publica.** Nada de aprovação em duas etapas — foi ela que travou o sistema atual em silêncio.

### 5.3 Publicar

Worker único, tick de 60s, `await` em série (nunca `setInterval` solto):

```ts
// pseudo — o SKIP LOCKED é o que substitui BullMQ com segurança
const pendentes = await prisma.$queryRaw`
  SELECT id FROM publicacoes
  WHERE status = 'PENDENTE' AND "agendadaPara" <= now()
  ORDER BY "agendadaPara"
  LIMIT 5
  FOR UPDATE SKIP LOCKED`;
```

Para cada uma: marca `PUBLICANDO` → chama o publisher → `PUBLICADA` com `idPostExterno`.

**Falha:** `tentativas++`, volta para `PENDENTE` com `agendadaPara = now() + 10min`. Na 4ª tentativa vira `FALHOU` e aparece no painel. (Hoje `FALHOU` é terminal e ninguém fica sabendo.)

### 5.4 Clique

`/go/:codigo` → registra `Clique` com `origem` do parâmetro `?o=` → 302 para `linkAfiliado`. Mantém o que já existe em `app/go/[code]/route.ts`.

---

## 6. Agendamento — as regras que faltavam

1. **Janela, não minuto exato.** Buscar `agendadaPara <= now()`, nunca `time === "19:30"`. Um tick atrasado não pode fazer o post sumir.
2. **Fuso explícito.** `TZ_APP=America/Sao_Paulo` no `.env`, aplicado no cálculo. Servidor em UTC posta às 6h da manhã sem ninguém entender por quê.
3. **Espaçamento por canal.** Próximo horário do canal que esteja ≥ `intervaloMinimoMin` depois da última publicação daquele canal.
4. **Cooldown de produto.** Mesmo produto não repete no mesmo canal antes de `cooldownDias`.
5. **Teto diário por canal.** Máximo configurável (sugestão: 6/dia no Facebook Page). Excedeu, empurra para o dia seguinte.

---

## 7. Conteúdo dos posts sociais

Template determinístico, **sem IA**. `lib/content/product-post.ts` já implementa e a regra que está lá é a certa: nenhum dado inventado — preço, desconto e avaliação só saem se vierem da API.

Ordem: `FOTO → NOME → PREÇO (e original riscado) → 1 LINHA SUA → CTA → LINK → AVISO DE AFILIADO`.

O aviso de afiliado é obrigatório em todos os canais (CDC art. 36 e política das plataformas).

---

## 8. Segurança

| Item | Decisão |
|---|---|
| Tokens de integração | AES-256-GCM em `Credencial.payload`. O `lib/integrations/crypto.ts` atual está correto — não mexer |
| `CREDENTIALS_ENCRYPTION_KEY` | Fora do repo, ≥32 caracteres, rotação documentada |
| Admin | NextAuth + middleware em `/admin/*` (já funciona) e checagem de sessão em **toda** rota `/api` que não seja pública |
| Rotas públicas | Só `/api/public/*` e `/go/*`. Nenhuma outra sem `auth()` |
| Webhooks | Verificação de assinatura obrigatória, ou removidos |
| Newsletter | Descadastro em um clique via `tokenBaixa`, sem login |

---

## 9. Fora de escopo (e por quê)

| Removido | Motivo |
|---|---|
| `ProductScore`, `Opportunity` | Você escolhe os produtos a dedo. Score é otimização de um problema que você não tem |
| `AutopilotRule` | Quarto caminho de execução paralelo. Era a única via que funcionava — mas o certo é ter **uma** |
| `Campaign` | Não usado no fluxo real |
| `AffiliateProject` / multi-projeto | Origem do bug de "publicar na Página do projeto errado". **Um deploy por site**: mesmo repo, `.env` e banco separados. Custa um container a mais e elimina uma classe inteira de erro |
| `lib/discovery`, `lib/scrape` (762 linhas de Playwright) | Descoberta automática é outro produto. E scraping é o componente mais frágil que existe |
| `lib/pinterest`, `lib/tiktok`, `lib/shopee` | Só quando o loop Mercado Livre → blog → Facebook/Telegram rodar 30 dias sozinho |
| **WhatsApp (Baileys)** | Lib não oficial, sessão por QR, risco real de banimento do número. Se o Telegram atende, corta |
| **Grupos do Facebook** | Meta encerrou a Groups API em abril/2024. Não existe caminho por API — só manual. O flag `assisted` que você criou é a resposta certa, mas mantenha isso fora do worker |
| BullMQ + Redis | No seu volume, `FOR UPDATE SKIP LOCKED` faz o mesmo sem um serviço a mais para cair |

---

## 10. Telas do admin

Sete. Hoje são 46.

1. **Painel** — publicações de hoje, falhas, cliques da semana
2. **Produtos** — lista, cadastro por ID, edição
3. **Posts** — lista, editor markdown, seleção de produtos
4. **Fila** — publicações agendadas, reagendar, cancelar, republicar
5. **Canais** — cadastro, horários, cooldown, teste de conexão
6. **Integrações** — status dos tokens, reconectar
7. **Assinantes** — lista e exportação CSV

---

## 11. Stack

- Next.js 16 (App Router) + TypeScript
- Prisma 7 + PostgreSQL
- Worker: processo separado (`workers/index.ts`), PM2 — sem Redis
- Tailwind + shadcn/ui (mantém)
- Deploy: VPS com Docker Compose (Postgres + app + worker)

---

## 12. Fases

| Fase | Entrega | Pronto quando |
|---|---|---|
| **1** | Blog + produtos manuais. Post, ItemDePost, Produto, `/go` | Você publica um post de jornada e uma lista de produtos sem tocar em banco |
| **2** | Importação Mercado Livre por ID | Cola ID + link → rascunho pronto em menos de 10 segundos |
| **3** | Distribuição: Telegram + Facebook Page | 7 dias seguidos publicando no horário, sem duplicata e sem post perdido |
| **4** | Instagram, cliques por origem, newsletter | Você sabe qual canal traz clique |

Fase 3 só começa quando a 2 estiver rodando em produção. O erro do sistema atual foi construir as quatro em paralelo em seis dias.

---

## 13. Migração

Não refatorar. Branch `v2`, schema novo, e copiar os quatro arquivos que já estão certos:

- `lib/integrations/crypto.ts`
- `lib/mercado-livre/*` (OAuth + PKCE bem implementado)
- `lib/publishing/meta-publisher.ts` e `telegram-publisher.ts`
- `lib/content/product-post.ts` e `channel-formatters.ts`

Script único de migração de dados: `products` → `produtos`, `blog_posts` → `posts`, `project_channels` → `canais`. O resto das 40 tabelas não vai junto.

Estimativa: ~1.200 linhas contra as 19.562 atuais.
