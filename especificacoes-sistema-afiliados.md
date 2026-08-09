# Sistema de Automação de Afiliados — Especificações

## 1. Visão geral

Sistema fullstack para gerenciamento e automação de operações de afiliados, inicialmente integrado a:

- Shopee Afiliados
- TikTok Shop
- Facebook
- Instagram

O sistema será construído com:

- Next.js + TypeScript
- Next.js Fullstack (Route Handlers / Server Actions conforme o caso)
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- shadcn/ui
- Redis + BullMQ para filas e processamento assíncrono, quando necessário

O sistema deverá ser projetado de forma modular para permitir a inclusão futura de outras plataformas de afiliados e canais de publicação.

O usuário pretende utilizar grupos específicos do Facebook voltados para vendas. Esses grupos serão tratados como um canal legítimo de distribuição, desde que a publicação seja compatível com as regras de cada grupo. O sistema não terá como objetivo publicar indiscriminadamente em grupos.

---

# 2. Objetivo do sistema

Criar uma plataforma própria capaz de:

1. Importar produtos das plataformas de afiliados.
2. Normalizar e armazenar informações dos produtos.
3. Atualizar preços, descontos, disponibilidade e demais informações.
4. Identificar automaticamente produtos com potencial de venda.
5. Calcular um score de oportunidade.
6. Gerar links de afiliado rastreáveis.
7. Criar textos e peças de conteúdo.
8. Organizar campanhas.
9. Agendar publicações.
10. Publicar automaticamente nos canais conectados.
11. Registrar cliques e resultados.
12. Consolidar vendas e comissões disponíveis nas plataformas.
13. Identificar os produtos e canais mais rentáveis.
14. Permitir operação manual, semiautomática e automática.
15. Preparar a estrutura para um futuro blog de vendas de produtos para casa e dia a dia.

---

# 3. Arquitetura geral

```text
                         ┌──────────────────────┐
                         │       SHOPEE         │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │     TIKTOK SHOP      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │      PRODUCT INGESTOR        │
                    │                              │
                    │ Importação                   │
                    │ Normalização                 │
                    │ Atualização                   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     PRODUCT INTELLIGENCE     │
                    │                              │
                    │ Score                        │
                    │ Desconto                     │
                    │ Avaliação                    │
                    │ Vendas                       │
                    │ Comissão                     │
                    │ Tendência                    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │       CONTENT ENGINE         │
                    │                              │
                    │ Textos                       │
                    │ Imagens                      │
                    │ Templates                    │
                    │ IA                           │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │       CAMPAIGN ENGINE        │
                    │                              │
                    │ Campanhas                    │
                    │ Regras                       │
                    │ Segmentação                  │
                    │ Agendamento                  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
              ┌─────────────────────────────────────────┐
              │          PUBLISHING ENGINE              │
              │                                         │
              │ Facebook │ Instagram │ TikTok │ Outros │
              └────────────────────┬────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     TRACKING & ANALYTICS     │
                    │                              │
                    │ Cliques                     │
                    │ Conversões                  │
                    │ Vendas                       │
                    │ Comissão                     │
                    │ CTR                          │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │          AUTOPILOT            │
                    │                              │
                    │ Regras                       │
                    │ Automação                    │
                    │ Otimização                   │
                    └──────────────────────────────┘
```

---

# 4. Stack tecnológica

## 4.1 Aplicação

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui

## 4.2 Backend

O backend será implementado dentro do próprio Next.js.

Estrutura prevista:

```text
app/
├── api/
├── admin/
├── dashboard/
└── ...
```

Não é necessário utilizar NestJS inicialmente.

---

# 5. Banco de dados

## PostgreSQL

O banco será PostgreSQL, acessado através do Prisma ORM.

O banco deverá ser projetado para separar:

- Produtos
- Fontes de produtos
- Plataformas de afiliados
- Links
- Conteúdos
- Campanhas
- Publicações
- Canais
- Cliques
- Conversões
- Comissões
- Score
- Oportunidades
- Jobs
- Configurações

---

# 6. Entidades principais

## 6.1 Product

Representa o produto normalizado dentro do sistema.

Campos sugeridos:

```text
id
source
externalId
name
slug
description
brand
categoryId

imageUrl
productUrl

price
originalPrice
discountPercent

rating
reviewCount
soldCount

commissionPercent
commissionValue

currency

status

createdAt
updatedAt
```

---

## 6.2 ProductSource

Permite que um mesmo produto tenha registros provenientes de diferentes plataformas.

```text
id
productId
platform
externalId
externalUrl
affiliateUrl
storeName
rawData
lastSyncedAt
createdAt
updatedAt
```

Plataformas iniciais:

```text
SHOPEE
TIKTOK_SHOP
```

A arquitetura deve permitir:

```text
AMAZON
ALIEXPRESS
MAGALU
MERCADO_LIVRE
OUTRAS
```

no futuro.

---

# 7. Categorias

## Category

```text
id
name
slug
description
parentId
active
createdAt
updatedAt
```

A estrutura deverá aceitar categorias hierárquicas.

Exemplo:

```text
Casa
├── Cozinha
├── Organização
├── Limpeza
├── Decoração
├── Iluminação
└── Eletrodomésticos

Dia a Dia
├── Acessórios
├── Utilidades
├── Escritório
├── Ferramentas
└── Cuidados pessoais
```

A taxonomia definitiva será definida posteriormente junto com o planejamento do blog.

---

# 8. Product Score

O sistema deverá calcular automaticamente um score para cada produto.

## ProductScore

```text
id
productId

discountScore
ratingScore
salesScore
commissionScore
priceScore
trendScore
conversionScore

totalScore

calculatedAt
```

O score inicial poderá considerar:

- Percentual de desconto
- Avaliação
- Quantidade de avaliações
- Quantidade de vendas
- Comissão
- Preço
- Tendência
- Histórico de cliques
- Histórico de conversões

Exemplo conceitual:

```text
Desconto       20%
Avaliação      20%
Vendas         15%
Comissão       15%
Preço          10%
Tendência      10%
Conversão      10%
```

Os pesos deverão ser configuráveis e posteriormente ajustados com dados reais.

---

# 9. Opportunity

Representa uma oportunidade identificada pelo sistema.

```text
id
productId
type
score
reason
metadata
status
createdAt
updatedAt
```

Tipos possíveis:

```text
PRICE_DROP
HIGH_DISCOUNT
HIGH_SALES
TRENDING
HIGH_COMMISSION
HIGH_CONVERSION
NEW_PRODUCT
CAMPAIGN
```

Exemplo:

```text
Produto: Air Fryer X

Score: 93

Motivos:
- preço caiu 27%
- desconto atual de 33%
- avaliação 4.8
- mais de 15.000 vendas
- comissão acima da média
```

---

# 10. AffiliateLink

Cada divulgação poderá ter seu próprio link rastreável.

```text
id
productId

platform
channel

affiliateUrl
subId

clicks
conversions
commission

createdAt
updatedAt
```

Canais:

```text
FACEBOOK
INSTAGRAM
TIKTOK
TELEGRAM
WEBSITE
BLOG
PINTEREST
OUTROS
```

Para Shopee, o sistema deverá utilizar Sub_id quando disponível, permitindo diferenciar a origem da divulgação.

Exemplo:

```text
facebook_group
instagram_feed
instagram_story
website
blog_article
telegram
```

---

# 11. Tracking próprio

O sistema poderá criar URLs intermediárias:

```text
https://dominio.com/go/abc123
```

Fluxo:

```text
Usuário
   ↓
/go/abc123
   ↓
Registro do clique
   ↓
Redirecionamento
   ↓
Link de afiliado
   ↓
Shopee / TikTok Shop
```

Isso permite medir o desempenho dos canais mesmo quando a plataforma de afiliados não fornece todos os dados de origem.

## Click

```text
id
affiliateLinkId

ipHash
userAgent
referer

country
device
browser

createdAt
```

Não armazenar dados pessoais desnecessários.

O tracking próprio deverá ser tratado de acordo com as exigências legais e de privacidade aplicáveis.

---

# 12. Campaign

Representa uma campanha comercial.

```text
id
name
description

startAt
endAt

status

createdAt
updatedAt
```

Exemplos:

```text
Ofertas do Dia
Casa em Oferta
Achadinhos para Cozinha
Produtos até R$50
Ofertas de Organização
Especial de Fim de Semana
```

---

# 13. CampaignProduct

Relacionamento entre produtos e campanhas.

```text
id
campaignId
productId

priority
status

createdAt
updatedAt
```

Um produto poderá participar de várias campanhas.

---

# 14. Content

Representa o conteúdo produzido para divulgar um produto.

```text
id

productId
campaignId

type
title
description
caption
hashtags

imageUrl
videoUrl

status

createdAt
updatedAt
```

Tipos:

```text
FACEBOOK_POST
INSTAGRAM_POST
INSTAGRAM_STORY
INSTAGRAM_REEL
TIKTOK_VIDEO
TELEGRAM_POST
BLOG_ARTICLE
```

---

# 15. ContentTemplate

Templates específicos para cada canal.

```text
id
name
channel
type
template
active
createdAt
updatedAt
```

Exemplo de template Facebook:

```text
🔥 {{headline}}

{{description}}

💰 De {{oldPrice}}
🔥 Por {{price}}

⭐ {{rating}}

👉 {{cta}}
```

Instagram, TikTok, Telegram e Blog deverão possuir formatos próprios.

---

# 16. AI Content Engine

A IA será responsável por auxiliar na criação de conteúdo.

Entrada:

```json
{
  "product": {
    "name": "Air Fryer 5L",
    "price": 199.90,
    "originalPrice": 299.90,
    "discount": 33,
    "rating": 4.8
  },
  "channel": "FACEBOOK"
}
```

Saída:

- Headline
- Descrição
- CTA
- Hashtags
- Variações de texto
- Sugestão de título
- Sugestão de abordagem

A IA não deverá inventar:

- preços
- descontos
- avaliações
- quantidade de vendas
- características não fornecidas pelo produto

---

# 17. Geração de imagens

O sistema deverá permitir a criação de artes de divulgação.

Estrutura:

```text
Produto
   ↓
Template visual
   ↓
Imagem
   ↓
Conteúdo
   ↓
Publicação
```

As artes deverão poder utilizar:

- Foto oficial do produto
- Preço
- Desconto
- Título
- CTA
- Identidade visual da marca
- Categoria

O sistema deverá manter templates reutilizáveis.

---

# 18. Publication

Representa uma publicação programada ou realizada.

```text
id
contentId
channel

scheduledAt
publishedAt

status

externalPostId

error
attempts

createdAt
updatedAt
```

Status:

```text
DRAFT
QUEUED
PUBLISHING
PUBLISHED
FAILED
CANCELLED
```

---

# 19. Canais

Criar uma camada abstrata de publicação.

```text
Publisher
├── MetaPublisher
│   ├── Facebook
│   └── Instagram
│
├── TikTokPublisher
│
├── TelegramPublisher
│
└── FuturePublishers
```

O sistema deverá permitir:

```typescript
publisher.publish(content)
```

sem que o restante da aplicação precise conhecer detalhes específicos da API.

---

# 20. Meta Integration

Como já existem APIs do Facebook e Instagram, criar um módulo:

```text
lib/meta/
```

Com responsabilidades como:

```text
authenticate()
getAccounts()
publishFacebookPost()
publishInstagramPost()
publishStory()
publishReel()
getInsights()
refreshToken()
```

A implementação deverá respeitar as permissões e endpoints efetivamente disponíveis para as contas conectadas.

---

# 21. TikTok Integration

Criar:

```text
lib/tiktok/
```

Responsabilidades previstas:

```text
authenticate()
getProducts()
getAffiliateProducts()
generateAffiliateLink()
publish()
getAnalytics()
refreshToken()
```

A implementação deverá seguir as APIs e permissões disponíveis para a conta e região utilizadas.

---

# 22. Shopee Integration

Criar:

```text
lib/shopee/
```

Responsabilidades previstas:

```text
authenticate()
searchProducts()
getProduct()
generateAffiliateLink()
getCampaigns()
getReports()
```

A integração deverá ficar isolada da lógica de negócio.

---

# 23. Product Ingestor

Worker responsável pela entrada de produtos.

Fluxo:

```text
Shopee / TikTok Shop
        ↓
Importação
        ↓
Normalização
        ↓
Deduplicação
        ↓
Atualização
        ↓
Score
        ↓
Opportunity
```

O sistema não deverá criar duplicatas a cada sincronização.

Deverão existir identificadores externos e regras de deduplicação.

---

# 24. Workers e filas

Para tarefas assíncronas e processamento em volume, utilizar:

- Redis
- BullMQ

Filas iniciais:

```text
product-import
product-sync
product-score
content-generation
image-generation
publication
analytics-sync
affiliate-sync
```

Exemplo:

```text
Cron
 ↓
product-sync
 ↓
BullMQ
 ↓
Worker
 ↓
Shopee API
 ↓
PostgreSQL
```

---

# 25. Scheduler

O sistema deverá possuir um agendador de publicações.

Exemplo:

```text
08:00  Oferta Casa
09:30  Produto em destaque
12:00  Oferta do Dia
15:00  Achadinho
18:00  Oferta Tech
21:00  Oferta Especial
```

O usuário deverá poder configurar:

- Canal
- Horário
- Categoria
- Quantidade de posts
- Campanha
- Tipo de conteúdo
- Score mínimo
- Faixa de preço
- Desconto mínimo

---

# 26. Smart Scheduler

Em uma segunda fase, o sistema poderá analisar o desempenho histórico.

Exemplo:

```text
Facebook

09:00 → CTR 1.2%
13:00 → CTR 2.4%
19:00 → CTR 3.8%

Instagram

12:00 → CTR 1.8%
20:00 → CTR 4.1%
```

Com o tempo, o sistema poderá recomendar ou escolher horários de maior desempenho.

---

# 27. Autopilot

O sistema deverá possuir três níveis de automação.

## Manual

```text
Produto encontrado
        ↓
Usuário cria conteúdo
        ↓
Usuário publica
```

## Semiautomático

```text
Produto encontrado
        ↓
IA cria conteúdo
        ↓
Usuário aprova
        ↓
Sistema publica
```

## Automático

```text
Produto encontrado
        ↓
Score
        ↓
Regras
        ↓
IA
        ↓
Conteúdo
        ↓
Fila
        ↓
Publicação
```

O modo automático deverá possuir limites e regras configuráveis.

---

# 28. Regras do Autopilot

Exemplo:

```text
SE
score >= 90
E
discount >= 30%
E
rating >= 4.6
E
commission >= 5%

ENTÃO

gerar conteúdo
adicionar à campanha "Ofertas do Dia"
agendar para próximo horário disponível
```

Outras regras:

```text
Preço máximo
Preço mínimo
Desconto mínimo
Comissão mínima
Score mínimo
Avaliação mínima
Vendas mínimas
Categorias permitidas
Categorias bloqueadas
Quantidade máxima de publicações por dia
```

---

# 29. Dashboard

O dashboard deverá mostrar:

```text
┌────────────────────────────────────────────┐
│ AFFILIATE MANAGER                          │
├──────────────┬──────────────┬──────────────┤
│ CLIQUES      │ CONVERSÕES   │ COMISSÃO     │
│ 18.492       │ 387          │ R$ 2.842     │
├──────────────┴──────────────┴──────────────┤
│                                            │
│ PERFORMANCE DOS CANAIS                     │
│                                            │
│ Facebook       ████████████████            │
│ Instagram      ███████████                 │
│ TikTok         ███████                     │
│ Website        █████                       │
│                                            │
├────────────────────────────────────────────┤
│ MELHORES PRODUTOS                          │
│                                            │
│ Air Fryer       Score 94                   │
│ Fone Bluetooth  Score 91                   │
│ Aspirador       Score 88                   │
└────────────────────────────────────────────┘
```

KPIs:

- Cliques
- Conversões
- Vendas
- Comissão
- CTR
- Taxa de conversão
- Receita estimada
- Comissão por canal
- Comissão por produto
- Comissão por campanha

---

# 30. Tela de produtos

Filtros:

```text
Plataforma
Categoria
Preço
Desconto
Avaliação
Vendas
Comissão
Score
Status
```

Ações:

```text
Ver
Editar
Criar conteúdo
Criar link
Adicionar à campanha
Publicar
Bloquear
```

---

# 31. Tela de oportunidades

Exemplo:

```text
🔥 OPORTUNIDADES

Air Fryer X
Score 94
Desconto 33%
Avaliação 4.8
15 mil vendas

[Gerar conteúdo]

────────────────────

Fone Bluetooth
Score 91
Desconto 41%
Avaliação 4.7

[Gerar conteúdo]
```

---

# 32. Tela de conteúdo

A tela deverá permitir:

- Visualizar imagem
- Editar título
- Editar descrição
- Editar CTA
- Regenerar texto
- Alterar template
- Selecionar canais
- Agendar
- Publicar imediatamente
- Duplicar conteúdo

---

# 33. Tela de campanhas

Exemplo:

```text
🔥 OFERTAS DO DIA

Produtos: 42
Publicações: 12
Cliques: 4.821
Conversões: 93
Comissão: R$ 742

[Produtos]
[Conteúdos]
[Publicações]
[Analytics]
```

---

# 34. Analytics

O sistema deverá permitir análises por:

- Produto
- Categoria
- Plataforma
- Canal
- Campanha
- Data
- Tipo de conteúdo
- Horário

Exemplo:

```text
Facebook
Produto: Air Fryer
Cliques: 1.842
Conversões: 42
Comissão: R$ 312

Instagram
Cliques: 924
Conversões: 17
Comissão: R$ 128
```

---

# 35. Ranking de produtos

Criar ranking automático:

```text
TOP PRODUTOS

1. Air Fryer             Score 94
2. Fone Bluetooth        Score 91
3. Organizador           Score 89
4. Aspirador             Score 88
5. Luminária             Score 86
```

Também:

```text
TOP PRODUTOS POR COMISSÃO

TOP PRODUTOS POR CLIQUES

TOP PRODUTOS POR CONVERSÃO

TOP CATEGORIAS

TOP CANAIS
```

---

# 36. Segurança

Credenciais das APIs não deverão ser armazenadas em texto exposto.

Utilizar:

```text
.env
```

e/ou armazenamento seguro de tokens.

Exemplo:

```text
SHOPEE_APP_ID
SHOPEE_SECRET
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
META_APP_ID
META_APP_SECRET
DATABASE_URL
REDIS_URL
```

Tokens de usuários deverão ser tratados de maneira segura, com criptografia quando apropriado.

---

# 37. Logs

Criar sistema de logs para:

- Sincronizações
- APIs
- Publicações
- Falhas
- Webhooks
- Jobs
- Geração de conteúdo
- Atualização de produtos

Exemplo:

```text
2026-08-08 10:00
[PRODUCT_SYNC]
Shopee: 482 produtos atualizados

2026-08-08 10:03
[CONTENT]
Produto 381 → conteúdo gerado

2026-08-08 10:05
[PUBLISH]
Facebook → sucesso
```

---

# 38. Retry

Integrações externas deverão possuir retry controlado.

Exemplo:

```text
Tentativa 1
    ↓
Falhou
    ↓
Aguardar
    ↓
Tentativa 2
    ↓
Falhou
    ↓
Tentativa 3
    ↓
FAILED
```

Evitar loops infinitos.

---

# 39. Rate limiting

Cada integração deverá possuir controle próprio de limite de requisições.

Não assumir que todas as APIs possuem os mesmos limites.

Criar abstração:

```text
RateLimiter
```

por provider.

---

# 40. Webhooks

Quando suportado pelas plataformas, utilizar webhooks para eventos relevantes.

Estrutura:

```text
app/api/webhooks/
├── shopee/
├── tiktok/
└── meta/
```

Todos os webhooks deverão validar autenticidade antes de processar os eventos.

---

# 41. Administração

Área administrativa:

```text
/admin
```

Menu:

```text
Dashboard

Produtos
Oportunidades
Categorias

Conteúdo
Templates
Campanhas

Publicações
Agenda

Canais
Integrações

Analytics
Cliques
Conversões
Comissões

Autopilot
Regras
Jobs
Logs

Configurações
```

---

# 42. Modelo de operação recomendado

O sistema deverá começar com operação semiautomática.

```text
APIs
 ↓
Produtos
 ↓
Score
 ↓
Oportunidades
 ↓
IA gera conteúdo
 ↓
Usuário aprova
 ↓
Publicação
 ↓
Analytics
```

Após acumular dados:

```text
APIs
 ↓
Produtos
 ↓
Score
 ↓
Oportunidades
 ↓
Regras
 ↓
IA
 ↓
Autopilot
 ↓
Publicação
 ↓
Analytics
 ↓
Melhoria do Score
```

---

# 43. MVP

A primeira versão não deverá implementar todas as funcionalidades.

## Fase 1 — Base

- [ ] Next.js
- [ ] TypeScript
- [ ] Prisma
- [ ] PostgreSQL
- [ ] Autenticação
- [ ] Dashboard
- [ ] Estrutura de integrações
- [ ] Estrutura de logs

## Fase 2 — Produtos

- [ ] Integração Shopee
- [ ] Integração TikTok Shop
- [ ] Importação
- [ ] Normalização
- [ ] Categorias
- [ ] Atualização de preço
- [ ] Score
- [ ] Oportunidades

## Fase 3 — Afiliados

- [ ] Geração de links
- [ ] Sub_id
- [ ] Tracking
- [ ] Redirecionamento
- [ ] Registro de cliques

## Fase 4 — Conteúdo

- [ ] Templates
- [ ] IA
- [ ] Geração de textos
- [ ] Geração de imagens
- [ ] Aprovação

## Fase 5 — Publicação

- [ ] Facebook
- [ ] Instagram
- [ ] Agendamento
- [ ] Fila
- [ ] Retry
- [ ] Logs

## Fase 6 — Analytics

- [ ] Cliques
- [ ] Conversões
- [ ] Comissão
- [ ] Performance por canal
- [ ] Performance por produto
- [ ] Performance por campanha

## Fase 7 — Autopilot

- [ ] Regras
- [ ] Seleção automática
- [ ] Geração automática
- [ ] Agendamento automático
- [ ] Otimização de horários

---

# 44. Estrutura de diretórios proposta

```text
affiliate-manager/
│
├── app/
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── opportunities/
│   │   ├── categories/
│   │   ├── content/
│   │   ├── templates/
│   │   ├── campaigns/
│   │   ├── publications/
│   │   ├── schedules/
│   │   ├── channels/
│   │   ├── analytics/
│   │   ├── autopilot/
│   │   ├── jobs/
│   │   ├── logs/
│   │   └── settings/
│   │
│   ├── api/
│   │   ├── products/
│   │   ├── opportunities/
│   │   ├── content/
│   │   ├── campaigns/
│   │   ├── publications/
│   │   ├── tracking/
│   │   ├── analytics/
│   │   ├── integrations/
│   │   └── webhooks/
│   │
│   └── ...
│
├── components/
│   ├── dashboard/
│   ├── products/
│   ├── content/
│   ├── campaigns/
│   ├── analytics/
│   └── ui/
│
├── lib/
│   ├── shopee/
│   ├── tiktok/
│   ├── meta/
│   ├── ai/
│   ├── tracking/
│   ├── scoring/
│   ├── publishing/
│   └── database/
│
├── workers/
│   ├── products/
│   ├── content/
│   ├── publishing/
│   ├── analytics/
│   └── affiliate/
│
├── prisma/
│   └── schema.prisma
│
├── scripts/
│
└── package.json
```

---

# 45. Evolução futura

A arquitetura deverá permitir adicionar:

- Telegram
- WhatsApp
- Pinterest
- YouTube
- Amazon
- AliExpress
- Magalu
- Mercado Livre
- Outros programas de afiliados

Também poderá ser integrado posteriormente a um site/blog de conteúdo comercial.

O blog poderá consumir diretamente a mesma base de produtos:

```text
                     PRODUCT DATABASE
                            │
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
        Facebook        Instagram        Blog
             ↓              ↓              ↓
        Publicação      Publicação      Artigo SEO
```

Isso evita manter produtos separados no sistema de afiliados e no WordPress.

---

# 46. Princípio central do projeto

O sistema não deve ser apenas um publicador automático de links.

A principal inteligência deverá estar em:

```text
DESCOBRIR
   ↓
AVALIAR
   ↓
SELECIONAR
   ↓
CRIAR
   ↓
DISTRIBUIR
   ↓
MEDIR
   ↓
APRENDER
```

O objetivo final é transformar dados de produtos e desempenho em decisões automáticas sobre **qual produto divulgar, onde divulgar, como apresentar e quando publicar**.

---

# 47. Próxima etapa

Após a implementação da especificação do sistema de afiliados, o próximo projeto será definir a estratégia do site WordPress como um **blog comercial de produtos para casa e dia a dia**.

Essa etapa deverá abordar separadamente:

- posicionamento do blog
- nome e identidade
- categorias
- arquitetura de conteúdo
- SEO
- tipos de artigos
- páginas de produtos
- páginas de ofertas
- links de afiliado
- integração com o sistema
- automação de publicação
- Google Discover
- Google News, quando aplicável
- Pinterest
- Facebook
- monetização
- experiência do usuário
- estrutura para crescimento orgânico

A arquitetura do blog não deverá ser definida antes de estabelecermos sua estratégia editorial e seu modelo de aquisição de tráfego.
