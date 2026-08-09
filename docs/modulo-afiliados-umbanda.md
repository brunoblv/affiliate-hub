# Módulo de Afiliados — Página de Umbanda

## Objetivo

Criar um módulo de afiliados especializado em produtos relacionados à Umbanda e espiritualidade, usando a página existente como principal canal de audiência.

O módulo deverá permitir:
- cadastrar produtos afiliados;
- organizar produtos por categorias;
- gerar e armazenar links de afiliado;
- criar publicações para a página;
- preparar publicações para grupos públicos relacionados ao tema;
- controlar campanhas e tags;
- acompanhar cliques e desempenho;
- separar completamente essa operação do projeto Meu Novo Lar.

## Conceito

A página não deve virar uma simples vitrine.

Estratégia:

```text
Conteúdo espiritual
        +
Recomendação de produtos
        +
Contexto/explicação
        +
Link afiliado
```

A prioridade é criar conteúdo útil e contextualizado, em vez de apenas publicar anúncios.

## Categorias

### Velas e iluminação
- velas;
- castiçais;
- suportes.

### Defumação
- incensos;
- defumadores;
- ervas;
- carvão;
- recipientes apropriados.

### Artigos religiosos
- pembas;
- quartinhas;
- alguidares;
- imagens;
- estátuas;
- objetos decorativos.

### Guias e acessórios
- fios de contas;
- contas;
- acessórios relacionados a guias.

### Vestuário
- roupas brancas;
- saias;
- batas;
- turbantes;
- acessórios.

### Livros
- Umbanda;
- Orixás;
- espiritualidade;
- história das religiões afro-brasileiras.

### Baralhos e oráculos
- baralho cigano;
- tarot;
- oráculos;
- livros.

### Decoração
- quadros;
- objetos;
- suportes;
- elementos para espaços religiosos.

## Arquitetura

O módulo usa o mesmo motor de afiliados do Meu Novo Lar, mas com projeto independente.

```text
Affiliate Commerce Engine
          |
     +----+----+
     |         |
     v         v
Meu Novo Lar  Umbanda
     |         |
Casa/Reforma  Espiritualidade
     |         |
     +----+----+
          |
       Offers
          |
   +------+------+------+
   |             |      |
   v             v      v
Mercado Livre  Shopee  TikTok Shop
```

Código pode ser compartilhado; dados, categorias, campanhas, canais e conteúdo permanecem separados.

## Projeto

```prisma
enum ProjectType {
  HOME
  UMBANDA
}

model AffiliateProject {
  id          String      @id @default(cuid())
  name        String
  slug        String      @unique
  type        ProjectType
  description String?
  active      Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  products    AffiliateProjectProduct[]
  campaigns   AffiliateCampaign[]
}
```

Projeto:

```text
Nome: Umbanda
Slug: umbanda
Tipo: UMBANDA
```

## Produtos

```prisma
model AffiliateProduct {
  id          String   @id @default(cuid())
  name        String
  description String?
  imageUrl    String?
  category    String?
  brand       String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  offers      AffiliateOffer[]
}
```

## Ofertas

```prisma
model AffiliateOffer {
  id             String   @id @default(cuid())
  productId      String
  platform       String
  externalId     String?
  title          String?
  price          Decimal?
  originalPrice  Decimal?
  currency       String?
  productUrl     String?
  affiliateUrl   String?
  affiliateTag   String?
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  product AffiliateProduct @relation(fields: [productId], references: [id])
}
```

## Campanhas

Exemplos:

```text
UMB-FACEBOOK
UMB-PAGINA
UMB-GRUPO
UMB-GRUPO-01
UMB-GRUPO-02
UMB-VELAS
UMB-LIVROS
UMB-ORIXAS
UMB-GUIAS
```

```prisma
model AffiliateCampaign {
  id          String   @id @default(cuid())
  projectId   String
  name        String
  code        String
  channel     String?
  description String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  project AffiliateProject @relation(fields: [projectId], references: [id])

  @@unique([projectId, code])
}
```

## Facebook — Página

A página será o principal canal.

O sistema deverá permitir:
- criar publicação;
- selecionar produto;
- selecionar campanha;
- gerar texto;
- selecionar imagem;
- incluir link;
- agendar;
- publicar;
- consultar status.

Fluxo:

```text
Produto
   ↓
Campanha UMB-FACEBOOK
   ↓
Gerador de conteúdo
   ↓
Imagem
   ↓
Facebook Page
```

## Estratégia de conteúdo

Para evitar transformar a página em vitrine:

```text
60% conteúdo espiritual/editorial
25% conteúdo de interação
15% conteúdo comercial/afiliado
```

Exemplos editoriais:
- curiosidades;
- explicações;
- perguntas;
- frases;
- história;
- fundamentos;
- entidades;
- Orixás;
- símbolos.

Interação:
- perguntas;
- enquetes;
- escolhas;
- identificação de símbolos.

Comercial:
- produtos;
- livros;
- artigos;
- recomendações;
- listas.

A proporção deve ser ajustada pelos resultados.

## Formato comercial

Evitar textos agressivos de venda.

Preferir:

```text
🕯️ Você procura uma pemba para o seu espaço religioso?

Encontramos algumas opções disponíveis no Mercado Livre.

👉 Confira as opções:
[LINK]

*Este conteúdo contém link de afiliado.
Podemos receber uma comissão se você realizar uma compra.
```

O texto final deve respeitar as regras da plataforma e do programa de afiliados.

## Grupos públicos

Cadastrar grupos como canais:

```prisma
model AffiliateChannel {
  id          String   @id @default(cuid())
  projectId   String
  name        String
  platform    String
  url         String?
  channelType String
  active      Boolean  @default(true)
  notes       String?
  createdAt   DateTime @default(now())
}
```

Tipos:

```text
PUBLIC_PAGE
PUBLIC_GROUP
PRIVATE_GROUP
PROFILE
```

Para divulgação via Mercado Livre, utilizar somente canais permitidos pelo programa e respeitar as regras de cada grupo.

Não automatizar grupos privados.

## Automação de grupos

A primeira versão deve funcionar como assistente, não como spam bot.

```text
Produto selecionado
        ↓
Campanha selecionada
        ↓
Gerar publicação
        ↓
Selecionar grupos permitidos
        ↓
Revisão
        ↓
Publicar / agendar
```

O administrador deve poder aprovar antes da publicação.

## Frequência

Evitar repetição.

Criar regras configuráveis:

```text
sameProductCooldown
sameGroupCooldown
sameCampaignCooldown
```

Exemplo inicial:

```text
Mesmo produto no mesmo grupo: mínimo 7 dias
Evitar repetir imediatamente o mesmo texto
Evitar repetir a mesma imagem consecutivamente
```

## Gerador de conteúdo

### Template página

```text
[GANCHO]

[CONTEXTO]

[RECOMENDAÇÃO]

[LINK]

[DISCLOSURE]
```

### Template grupo

```text
🛍️ [PRODUTO]

[DESCRIÇÃO CURTA]

💰 [PREÇO]

🔗 [LINK]

[DISCLOSURE]
```

### Template educativo

```text
📚 Você sabia?

[INFORMAÇÃO]

Se quiser conhecer produtos relacionados:
[LINK]
```

## IA

A IA poderá gerar:
- títulos;
- descrições;
- chamadas;
- variações;
- perguntas;
- legendas;
- conteúdo educativo;
- listas.

Não deve inventar:
- fundamentos religiosos;
- propriedades espirituais como fatos;
- benefícios médicos;
- características do produto;
- preços;
- descontos.

## Imagens

Permitir:

```text
Produto
   ↓
Imagem permitida
   ↓
Template
   ↓
Arte
```

Não utilizar imagens de terceiros sem verificar direitos de uso.

## Analytics

Registrar publicações:

```prisma
model AffiliatePublication {
  id           String   @id @default(cuid())
  projectId    String
  offerId      String?
  channelId    String?
  campaignId   String?
  platform     String
  externalId   String?
  content      String?
  status       String
  publishedAt  DateTime?
  createdAt    DateTime @default(now())
}
```

Cliques:

```prisma
model AffiliateClick {
  id          String   @id @default(cuid())
  offerId     String
  projectId   String
  campaignId  String?
  channelId   String?
  source      String?
  createdAt   DateTime @default(now())
}
```

## Dashboard

```text
Admin
└── Afiliados
    └── Umbanda
        ├── Visão geral
        ├── Produtos
        ├── Ofertas
        ├── Campanhas
        ├── Página Facebook
        ├── Grupos
        ├── Publicações
        ├── Agendamento
        └── Analytics
```

Métricas:
- cliques;
- conversões;
- receita;
- produtos mais clicados;
- categorias;
- campanhas;
- grupos;
- posts.

## Ranking

```text
🔥 Produtos mais clicados

1. Livro X       382 cliques
2. Guia Y        301 cliques
3. Pemba Z       227 cliques
4. Incenso A     191 cliques
```

Por categoria:

```text
Livros          42%
Artigos         31%
Velas           15%
Decoração        8%
Outros           4%
```

## Teste A/B

Testar:
- textos;
- imagens;
- chamadas;
- horários.

Exemplo:

```text
"Você conhece este produto?"
vs.
"Encontrei uma opção interessante..."
```

O objetivo é aumentar cliques sem prejudicar a relação com a audiência.

## Regras editoriais

Não fazer:
- spam;
- excesso de links;
- publicações repetitivas;
- promessas espirituais como garantia;
- alegações médicas;
- ataques a outras religiões;
- conteúdo enganoso;
- falsa urgência;
- preço falso.

Fazer:
- conteúdo útil;
- respeito à tradição;
- linguagem natural;
- transparência sobre afiliados;
- recomendações relevantes;
- variedade;
- curadoria.

## Estratégia inicial

Começar pequeno.

### Página

Por semana:

```text
3–5 conteúdos editoriais
1–2 conteúdos de interação
1–2 recomendações de produtos
```

### Grupos

Começar com:

```text
5–10 grupos públicos relevantes
```

Testar aceitação, cliques, regras, horários e categorias antes de ampliar.

## Tags

```text
UMB-PAGE
UMB-GROUPS
UMB-LIVROS
UMB-VELAS
UMB-GUIAS
UMB-ORIXAS
UMB-DECOR
```

Se permitido pela plataforma de afiliados:

```text
UMB-G01
UMB-G02
UMB-G03
```

## Exemplo de campanha

```text
Nome: Livros de Umbanda
Código: UMB-LIVROS
Canal: Facebook
Produto: Livro de Umbanda X
Destino: Página + grupos públicos permitidos
```

Página:
```text
Conteúdo educativo + recomendação
```

Grupo:
```text
Texto curto + produto + link
```

Depois:

```text
Cliques
   ↓
Conversões
   ↓
Receita
   ↓
ROI
```

## Separação do Meu Novo Lar

```text
Affiliate Commerce Engine
        |
        +-------------------------+
        |                         |
        v                         v
Meu Novo Lar                 Umbanda
HOME                         UMBANDA
        |                         |
Casa/Reforma                 Espiritualidade
        |                         |
MNL-* tags                   UMB-* tags
```

Não misturar:
- produtos;
- campanhas;
- páginas;
- grupos;
- templates;
- métricas;
- linguagem;
- calendário.

## Roadmap

### Fase 1 — Estrutura
- [ ] Criar AffiliateProject
- [ ] Criar projeto UMBANDA
- [ ] Criar categorias
- [ ] Criar Product
- [ ] Criar Offer
- [ ] Criar Campaign
- [ ] Criar Channel

### Fase 2 — Mercado Livre
- [ ] Integrar API oficial
- [ ] Pesquisar produtos
- [ ] Importar produto
- [ ] Criar oferta
- [ ] Definir método oficialmente autorizado para affiliateUrl

### Fase 3 — Facebook
- [ ] Conectar página
- [ ] Publicar
- [ ] Agendar
- [ ] Registrar publicação
- [ ] Registrar métricas

### Fase 4 — Grupos
- [ ] Cadastro de grupos
- [ ] Classificação público/privado
- [ ] Regras por grupo
- [ ] Templates
- [ ] Aprovação manual
- [ ] Agendamento permitido

### Fase 5 — Conteúdo
- [ ] Templates
- [ ] IA
- [ ] Imagens
- [ ] Variações
- [ ] Calendário editorial

### Fase 6 — Analytics
- [ ] Cliques
- [ ] Conversões
- [ ] Receita
- [ ] Ranking
- [ ] A/B testing
- [ ] ROI

## Objetivo final

Transformar a página em um canal de conteúdo + curadoria de produtos:

```text
AUDIÊNCIA
   ↓
Conteúdo útil
   ↓
Recomendação
   ↓
Produto certo
   ↓
Link afiliado
   ↓
Compra
   ↓
Comissão
   ↓
Analytics
   ↓
Melhor curadoria
```

A estratégia não é simplesmente postar produtos. É construir uma curadoria de produtos de Umbanda distribuída pela página e por grupos públicos permitidos, usando dados para descobrir quais produtos, categorias, conteúdos e canais realmente funcionam.
