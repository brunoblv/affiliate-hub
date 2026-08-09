# ChartFM — Especificação do Motor de Automação de Produtos

## Objetivo

Transformar o sistema atual em um motor automatizado de **descoberta → curadoria → publicação → distribuição → catálogo**.

O sistema deverá:

1. Buscar produtos nas APIs disponíveis.
2. Detectar promoções e quedas de preço.
3. Manter histórico de preços.
4. Calcular relevância/oportunidade.
5. Gerar conteúdo.
6. Publicar automaticamente no blog.
7. Publicar automaticamente na Página do Facebook.
8. Preparar publicações para grupos do Facebook em fluxo assistido.
9. Identificar produtos relacionados à música.
10. Enviar produtos musicais para a Loja do ChartFM.
11. Trabalhar inicialmente com Amazon via cadastro manual até a conta obter acesso à Creators API.

---

## 1. Arquitetura

```text
                    MOTOR DE PRODUTOS
                           |
            +--------------+--------------+
            |              |              |
            v              v              v
       Mercado Livre   TikTok Shop    Amazon
            API             API       futuramente
            |               |              |
            +---------------+--------------+
                            |
                            v
                    NORMALIZA PRODUTO
                            |
                    HISTÓRICO DE PREÇO
                            |
                    PROMOTION ENGINE
                            |
                    OPPORTUNITY SCORE
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
          Promoção      Produto normal   Música
             |              |              |
             +--------------+--------------+
                            |
                       BANCO DE DADOS
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
           BLOG        FACEBOOK PAGE    CHARTFM
             |              |              |
             |              |              v
             |              |            LOJA
             |              |
             v              v
          SEO/Google    GRUPOS FB
                       fluxo assistido
```

---

# 2. Primeira função — Caçador de ofertas

O sistema deverá executar diariamente, por exemplo:

```text
06:00
  ↓
Buscar produtos
  ↓
Buscar preços
  ↓
Buscar promoções
  ↓
Comparar histórico
  ↓
Classificar
  ↓
Selecionar melhores produtos
  ↓
Gerar conteúdo
  ↓
Publicar no blog
  ↓
Publicar na Página
  ↓
Preparar posts para grupos
```

Não buscar somente promoções.

Classificações:

```text
PROMOTION
NORMAL
FEATURED
NEW
OPPORTUNITY
```

Assim o sistema pode publicar tanto:

> 🔥 Oferta do dia

quanto:

> 💿 Produto interessante para fãs de determinado artista.

---

# 3. Mercado Livre

Utilizar a API para:

- buscar produtos;
- consultar dados;
- consultar preços;
- consultar promoções;
- identificar ofertas;
- importar informações;
- manter ofertas atualizadas.

A integração deve utilizar os recursos oficiais disponíveis para campanhas/ofertas.

---

# 4. TikTok Shop

Quando a conta estiver conectada e os escopos necessários estiverem disponíveis:

- pesquisar produtos;
- importar produtos;
- consultar preços;
- consultar promoções;
- atualizar ofertas;
- armazenar links.

---

# 5. Amazon

Inicialmente a Amazon funcionará em **modo manual**.

Fluxo:

```text
Amazon
   ↓
Usuário encontra produto
   ↓
Gera link de afiliado
   ↓
Cadastra no sistema
   ↓
Sistema publica
```

Quando a conta atingir a elegibilidade:

```text
Amazon Creators API
        ↓
Busca automática
        ↓
Catálogo
        ↓
Sincronização
```

A arquitetura deve estar preparada para substituir o provider manual pelo provider da Amazon.

---

# 6. Histórico de preços

Não armazenar somente o preço atual.

Registrar histórico:

```text
01/08 → R$ 299
02/08 → R$ 299
03/08 → R$ 279
04/08 → R$ 259
05/08 → R$ 199
```

Modelo:

```prisma
model ProductPriceHistory {
  id          String   @id @default(cuid())
  productId   String
  price       Decimal
  currency    String   @default("BRL")
  source      String
  capturedAt  DateTime @default(now())

  product Product @relation(
    fields: [productId],
    references: [id]
  )

  @@index([productId, capturedAt])
}
```

Isso permite detectar quedas reais.

---

# 7. Promotion Engine

Criar:

```text
lib/products/promotion-engine.ts
```

Entradas:

- preço atual;
- preço anterior;
- histórico;
- promoção oficial da plataforma;
- percentual de desconto;
- categoria;
- disponibilidade.

Saída:

```json
{
  "isPromotion": true,
  "promotionType": "PRICE_DROP",
  "discountPercentage": 32.5,
  "previousPrice": 299.90,
  "currentPrice": 199.90,
  "confidence": 0.98
}
```

Tipos:

```text
PRICE_DROP
CAMPAIGN
FLASH_DEAL
COUPON
CLEARANCE
NEW
FEATURED
NORMAL
```

---

# 8. Opportunity Score

Não publicar qualquer produto encontrado.

Exemplo:

```text
Opportunity Score: 91/100
```

Sugestão inicial:

```text
Desconto                 35%
Histórico de preço       25%
Popularidade             15%
Avaliações               10%
Relevância musical       10%
Disponibilidade            5%
```

Exemplo:

```text
Produto A
R$ 299 → R$ 289
Score: 24
Não publicar
```

```text
Produto B
R$ 399 → R$ 249
Score: 93
Publicar
```

Os pesos devem ser configuráveis.

---

# 9. Separar descoberta de publicação

O sistema deve trabalhar em etapas:

```text
DISCOVERY
    ↓
PRODUCT
    ↓
OFFER
    ↓
PROMOTION
    ↓
OPPORTUNITY
    ↓
CONTENT
    ↓
PUBLICATION
```

Um produto pode ser encontrado e salvo sem ser publicado.

---

# 10. Blog

O blog será um canal automático importante.

Não criar apenas:

> Produto X por R$ 199.

Criar conteúdo editorial.

Exemplo:

```text
/blog/ofertas/vinis-de-taylor-swift-em-promocao
```

Título:

> Vinis de Taylor Swift em promoção: confira as ofertas encontradas

Estrutura:

```text
Introdução
Produto 1
Produto 2
Produto 3
Conclusão
Disclosure
```

---

# 11. Tipos de conteúdo do blog

Automáticos:

```text
Ofertas
Produtos
Achados
Listas
Quedas de preço
Categorias
```

Editoriais:

```text
10 vinis que todo fã de rock deveria conhecer

Os melhores CDs para começar uma coleção

Presentes para fãs de Taylor Swift

Produtos interessantes para quem está montando uma coleção de vinis
```

---

# 12. Content Engine

Substituir o atual mecanismo exclusivamente determinístico por uma arquitetura híbrida:

```text
Content Engine
      |
      +-- AI Provider
      |
      +-- Template fallback
```

A IA poderá gerar:

- títulos;
- descrições;
- legendas;
- CTA;
- texto de Facebook;
- texto de blog;
- SEO title;
- meta description.

A IA nunca deverá inventar:

- preço;
- desconto;
- avaliação;
- disponibilidade;
- especificações;
- características do produto.

Ela deverá receber somente dados estruturados reais.

---

# 13. Facebook Página

A Página poderá ser automatizada.

Tipos:

### Oferta

```text
🔥 OFERTA DO DIA

Vinil X

De R$ 299
Por R$ 199

👉 Confira:
[link]
```

### Produto

```text
💿 Para quem é fã de...

Produto X

[descrição]

👉 Confira:
[link]
```

### Queda de preço

```text
📉 O preço caiu!

Produto X

Antes: R$ 299
Agora: R$ 199

👉 Ver produto
```

### Lista

```text
🎵 5 produtos para fãs de rock
```

---

# 14. Facebook Groups

Não implementar uma automação que tente publicar diretamente em grupos usando APIs antigas/restritas da Meta.

Criar uma:

## Central de Grupos

Fluxo:

```text
Produto
 ↓
IA gera publicação
 ↓
Seleciona grupos compatíveis
 ↓
Gera versão individual
 ↓
Fila
 ↓
Administrador clica
 ↓
Abre grupo
 ↓
Copia/cola/publica
 ↓
Marca como publicado
```

Exemplo:

```text
🔥 OFERTA

Vinil Taylor Swift
De R$ 299 por R$ 199

👉 Link: ...

[Copiar texto]
[Abrir grupo]
[Marcar como publicado]
```

---

# 15. Controle de grupos

Cada grupo deve possuir:

```text
nome
URL
categoria
tipo
permitirOfertas
permitirLinks
ativo
última publicação
cooldown
observações
```

Exemplo:

```text
Grupo A
Categoria: Música
Permite ofertas: SIM
Permite links: SIM
Cooldown: 7 dias
```

---

# 16. Controle de frequência

Criar:

```text
sameProductCooldown
sameGroupCooldown
sameCampaignCooldown
sameContentCooldown
```

Exemplo inicial:

```text
Mesmo produto no mesmo grupo:
mínimo 7 dias

Mesmo texto:
não reutilizar imediatamente

Mesma imagem:
evitar repetição consecutiva
```

Tudo configurável.

---

# 17. Music Matcher

Criar:

```text
MusicMatcher
```

Exemplo:

```text
Produto:
Taylor Swift 1989 (Taylor's Version) Vinyl

↓
Artista:
Taylor Swift

↓
Álbum:
1989 (Taylor's Version)

↓
Formato:
VINYL
```

Usar, quando disponíveis:

```text
ISRC
UPC
EAN
ASIN
artist name
album name
title normalization
fuzzy matching
```

Resultado:

```text
confidence = 0.99
```

Se houver dúvida:

```text
confidence = 0.62
```

Enviar para revisão.

---

# 18. Integração com ChartFM

Fluxo:

```text
Produto encontrado
        ↓
Music Matcher
        ↓
Artista
        ↓
Álbum
        ↓
StoreProduct
        ↓
StoreOffer
        ↓
ChartFM Loja
```

Exemplo:

```text
Taylor Swift
Midnights

💿 Vinil
R$ 299,90

[Comprar]
```

---

# 19. Promoção no ChartFM

Se o produto for promoção:

```text
isPromotion = true
promotionPercentage = 32
```

Na Loja:

```text
🔥 32% OFF
```

Quando a promoção terminar, a próxima sincronização deverá remover a flag.

---

# 20. Regras de publicação

Criar um Rules Engine.

Exemplos:

```text
Não publicar:
- produtos abaixo de R$ 20
- produtos acima de R$ 2.000
- categorias bloqueadas
- vendedores bloqueados
```

Automático:

```text
discount >= 20%
```

ou:

```text
Opportunity Score >= 80
```

Aprovação:

```text
Score 50–79
```

Ignorar:

```text
Score < 50
```

Tudo configurável.

---

# 21. Autopilot

Painel:

```text
🤖 AUTOPILOT

Mercado Livre
☑ Ativo

TikTok Shop
☑ Ativo

Amazon
☑ Manual

Blog
☑ Automático

Facebook Página
☑ Automático

Facebook Grupos
☑ Assistido

ChartFM Loja
☑ Automático
```

Última execução:

```text
09/08/2026 06:00

Produtos encontrados: 1.284
Produtos novos: 83
Promoções: 41
Oportunidades: 27
Publicações criadas: 12
Ignorados: 15
Erros: 0
```

---

# 22. Scheduler

Criar cron real.

Exemplo:

```text
05:30
Atualizar integrações

06:00
Product Discovery

06:15
Price Sync

06:30
Promotion Engine

06:45
Opportunity Scoring

07:00
Content Generation

07:15
Blog Publishing

07:30
Facebook Publishing

08:00
ChartFM Sync
```

Os horários devem ser configuráveis.

---

# 23. Jobs

Criar jobs independentes:

```text
product-discovery
product-sync
price-sync
promotion-detection
opportunity-scoring
music-matching
content-generation
blog-publish
facebook-publish
chartfm-sync
group-queue
```

Cada job deverá possuir:

```text
status
startedAt
finishedAt
attempts
error
duration
```

---

# 24. Retry

Falhas temporárias não devem matar o processo.

Exemplo:

```text
Tentativa 1
   ↓ falha
60 segundos
   ↓
Tentativa 2
   ↓ falha
5 minutos
   ↓
Tentativa 3
```

Depois:

```text
FAILED
```

e entrar na fila de erro.

---

# 25. Rate Limit

Cada integração deverá ter controle próprio:

```text
Mercado Livre
TikTok
Amazon
Meta
IA
```

Criar:

```text
RateLimitManager
```

O sistema não deve disparar chamadas indiscriminadamente.

---

# 26. Deduplicação

O mesmo produto pode aparecer em:

```text
Mercado Livre
TikTok
Amazon
```

Não criar três produtos independentes se forem o mesmo item.

Prioridade de identificação:

```text
ASIN
EAN
UPC
SKU
externalId
```

Fallback:

```text
artista + álbum + formato + edição
```

---

# 27. Bloqueios

Criar:

```text
BlockedSeller
BlockedCategory
BlockedKeyword
BlockedProduct
```

Exemplo:

```text
Keyword:
pirata
falsificado
```

Produto contendo palavra bloqueada:

```text
IGNORE
```

---

# 28. Dashboard operacional

Criar:

```text
🤖 Central de Automação
```

Mostrar:

```text
Última execução
Próxima execução

Produtos encontrados
Produtos novos
Promoções
Oportunidades
Publicações
Falhas

Workers
APIs
Filas
```

---

# 29. Monitoramento

Indicadores:

```text
🟢 Mercado Livre
🟢 TikTok
🟡 Amazon
🟢 Facebook
🟢 Blog
🟢 ChartFM
```

Ao clicar:

```text
Última chamada
Status
Tempo de resposta
Erros
Rate limit
```

---

# 30. Logs

Exemplo:

```text
[product-discovery]
Started: 06:00

Mercado Livre:
1.284 produtos

TikTok:
542 produtos

Total:
1.826
```

Depois:

```text
[promotion-engine]

41 promoções
27 oportunidades
1.758 ignorados
```

---

# 31. Amazon — plano para as 10 vendas

A Amazon deve ser tratada como projeto paralelo.

Inicialmente:

```text
Cadastro manual
```

Categorias prioritárias para o ChartFM:

```text
Vinis
CDs
Fones
Caixas de som
Livros de música
Microfones
Instrumentos
Acessórios
Produtos relacionados a artistas
```

Conteúdos:

```text
5 produtos para montar uma coleção de vinil

Presentes para fãs de Taylor Swift

7 livros para fãs de música

Fones para ouvir música com qualidade

Produtos interessantes para colecionadores
```

Objetivo:

```text
10 vendas qualificadas
        ↓
Elegibilidade
        ↓
Creators API
        ↓
Automação Amazon
```

Não esperar a Amazon para iniciar o restante do sistema.

---

# 32. O que falta no sistema atual

## Crítico

- [ ] Trigger real para `product-sync`
- [ ] Cron de sincronização
- [ ] Scheduler robusto
- [ ] Histórico de preços
- [ ] Promotion Engine
- [ ] Opportunity Score
- [ ] Deduplicação
- [ ] Sistema de aprovação
- [ ] Retry
- [ ] Rate-limit manager
- [ ] Logs
- [ ] Monitoramento de workers

## Muito importante

- [ ] Content Engine real
- [ ] Integração de IA
- [ ] Geração por canal
- [ ] SEO automático
- [ ] Geração/edição de imagens
- [ ] Music Matcher
- [ ] Categorias
- [ ] Campanhas
- [ ] Histórico de publicações
- [ ] Controle de frequência
- [ ] Controle de produtos repetidos
- [ ] Blacklist

## Operação

- [ ] Central de grupos
- [ ] Fila de publicação
- [ ] Aprovação
- [ ] Calendário
- [ ] Histórico
- [ ] Reprocessamento
- [ ] Pausar produto
- [ ] Bloquear vendedor
- [ ] Bloquear categoria

---

# 33. Ordem de desenvolvimento

## Fase 1 — Motor de descoberta

1. Cron real
2. Mercado Livre
3. TikTok
4. Normalização
5. Deduplicação
6. Histórico de preço
7. Detecção de promoção

## Fase 2 — Motor editorial

8. Opportunity Score
9. IA
10. Templates por canal
11. Blog
12. Facebook Page

## Fase 3 — ChartFM

13. Music Matcher
14. Integração com Loja
15. Produtos musicais
16. Flag de promoção

## Fase 4 — Operação

17. Central de grupos
18. Fila
19. Aprovação
20. Calendário
21. Logs
22. Retry
23. Rate limits

## Fase 5 — Amazon

24. Cadastro manual
25. Estratégia para 10 vendas
26. Creators API quando elegível
27. Sincronização automática

---

# 34. Fluxo final

```text
06:00
  ↓
Mercado Livre / TikTok / Amazon manual
  ↓
Buscar produtos
  ↓
Normalizar
  ↓
Deduplicar
  ↓
Atualizar preços
  ↓
Salvar histórico
  ↓
Detectar promoções
  ↓
Calcular oportunidade
  ↓
Identificar produtos musicais
  ↓
Relacionar artista/álbum
  ↓
DECISÃO
  |
  +-- Promoção forte → publicar
  |
  +-- Produto normal → catálogo
  |
  +-- Baixa relevância → ignorar
  |
  +-- Dúvida → aprovação
  ↓
Gerar conteúdo
  ↓
Blog
  ↓
Facebook Página
  ↓
Fila de grupos
  ↓
ChartFM Loja
```

---

# 35. Princípio central

O sistema não deve ser simplesmente um **bot de postagem**.

Ele deve ser um:

> **Motor de descoberta e curadoria de produtos.**

Arquitetura conceitual:

```text
DESCUBRIR
   ↓
ENTENDER
   ↓
COMPARAR
   ↓
CLASSIFICAR
   ↓
DECIDIR
   ↓
CRIAR
   ↓
PUBLICAR
   ↓
MEDIR
   ↓
APRENDER
```

O objetivo final é maximizar a automação sem sacrificar controle, qualidade, conformidade com as plataformas e relevância do conteúdo.
