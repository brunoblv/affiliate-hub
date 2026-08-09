# Meu Novo Lar — Integração com Mercado Livre

## Objetivo

O Meu Novo Lar será uma plataforma de conteúdo, ferramentas úteis e descoberta de produtos para pessoas que estão comprando, montando, reformando ou organizando a própria casa.

A integração com o Mercado Livre entra como uma das fontes de produtos e ofertas do sistema.

## Ecossistema

```text
                         MEU NOVO LAR
                              |
                         Next.js
                              |
                 Affiliate Commerce Engine
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
    Mercado Livre          Shopee            TikTok Shop
          |                   |                   |
     API oficial        Affiliate API      Affiliate API
          |                   |                   |
          +-------------------+-------------------+
                              |
                         Product / Offer
                              |
                  +-----------+-----------+
                  |                       |
                  v                       v
               Conteúdo             Redes sociais
                  |                       |
                 Blog              Instagram / Facebook
```

## Papel da API oficial do Mercado Livre

A API oficial deverá ser usada principalmente para:

- pesquisar produtos;
- consultar informações de produtos;
- consultar catálogo e categorias;
- alimentar o catálogo interno;
- descobrir produtos relevantes para conteúdos;
- complementar dados de ofertas e preços quando disponível.

A API oficial **não deve ser confundida com o Link Builder de afiliados**.

## Link Builder de afiliados

Durante a investigação do Portal de Afiliados foi identificada a chamada:

```text
POST https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink
```

Payload observado:

```json
{
  "urls": ["URL_DO_PRODUTO"],
  "tag": "TAG_DO_AFILIADO"
}
```

A resposta observada contém:

```json
{
  "status": 200,
  "urls": [
    {
      "id": "2HAG1h4",
      "created": true,
      "tag": "vieirabruno67",
      "short_url": "https://meli.la/2HAG1h4",
      "long_url": "...",
      "origin_url": "..."
    }
  ]
}
```

Esse endpoint funciona no Portal de Afiliados, mas deve ser tratado como **endpoint interno até que exista confirmação de que seu uso por aplicações externas é oficialmente autorizado**.

Não usar cookies, sessões pessoais ou tokens/CSRF capturados do navegador no backend.

## Aplicação oficial

Foi criada/configurada uma aplicação oficial do Mercado Livre Developers.

Variáveis sensíveis:

```env
MERCADOLIVRE_CLIENT_ID=""
MERCADOLIVRE_CLIENT_SECRET=""
MERCADOLIVRE_REDIRECT_URI=""
```

Nunca expor Client Secret, access token ou refresh token no frontend.

## Permissões

Configuração inicial recomendada:

```text
Usuários: Leitura e escrita

Comunicações pré e pós-vendas: Sem acesso
Publicação e sincronização: Sem acesso
Publicidade de um produto: Sem acesso
Faturamento de uma venda: Sem acesso
Métricas do negócio: Sem acesso
Promoções, cupons e descontos: Sem acesso
Venda e envios de um produto: Sem acesso
```

Não solicitar permissões de vendedor que não sejam necessárias.

## Tópicos / Webhooks

Na primeira versão, manter todos os tópicos sem seleção.

Webhooks poderão ser adicionados posteriormente caso alguma funcionalidade exija notificações.

## Arquitetura de produtos

Um produto deve existir uma única vez no catálogo, podendo possuir várias ofertas.

```text
Product
 |
 +-- ProductOffer (Mercado Livre)
 +-- ProductOffer (Shopee)
 +-- ProductOffer (TikTok Shop)
```

Exemplo:

```text
Air Fryer 5L

├── Mercado Livre
│   ├── preço
│   ├── URL
│   ├── affiliateUrl
│   └── externalId
│
├── Shopee
│   ├── preço
│   ├── URL
│   ├── affiliateUrl
│   └── externalId
│
└── TikTok Shop
    ├── preço
    ├── URL
    ├── affiliateUrl
    └── externalId
```

## Modelo Prisma

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  imageUrl    String?
  category    String?
  brand       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  offers      ProductOffer[]
}

model ProductOffer {
  id             String   @id @default(cuid())
  productId      String
  platform       AffiliatePlatform
  externalId     String?
  title          String?
  price          Decimal?
  originalPrice  Decimal?
  currency       String?
  productUrl     String?
  affiliateUrl   String?
  affiliateTag   String?
  imageUrl       String?
  available      Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id])
}

enum AffiliatePlatform {
  MERCADO_LIVRE
  SHOPEE
  TIKTOK_SHOP
}
```

## Providers

Não espalhar código específico de marketplace pelo projeto.

```ts
interface AffiliateProvider {
  searchProducts(query: string): Promise<Product[]>
  getProduct(id: string): Promise<Product>
}
```

Quando houver método oficial de geração de links:

```ts
interface AffiliateLinkProvider {
  generateAffiliateLink(
    productUrl: string,
    tag?: string
  ): Promise<string>
}
```

Estrutura:

```text
providers/
├── mercado-livre/
├── shopee/
└── tiktok-shop/
```

## MercadoLivreProvider

Responsabilidades iniciais:

```text
searchProducts()
getProduct()
getCategory()
normalizeProduct()
```

Fluxo:

```text
Mercado Livre API
       |
       v
MercadoLivreProvider
       |
       v
Produto normalizado
       |
       v
Product / ProductOffer
```

## Descoberta de produtos

O sistema poderá pesquisar automaticamente produtos como:

- air fryer;
- organizadores;
- furadeiras;
- luminárias;
- torneiras;
- aspiradores;
- ferramentas;
- itens de cozinha;
- produtos para reforma.

Essas pesquisas poderão alimentar:

- catálogo;
- artigos;
- listas;
- comparações;
- posts sociais;
- recomendações.

## Comparador de ofertas

Exemplo:

```text
AIR FRYER 5L

Mercado Livre     R$ 299,90
Shopee            R$ 279,90
TikTok Shop       R$ 289,90
```

O sistema poderá destacar menor preço, custo-benefício, disponibilidade e marketplace, sempre usando dados atuais suficientes.

## Conteúdo

Fluxo:

```text
Produto
   |
   v
Dados + preço + imagem + categoria
   |
   v
Motor de conteúdo
   |
   +-- artigo
   +-- lista
   +-- comparação
   +-- review
   +-- Instagram
   +-- Facebook
```

## WordPress

```text
Mercado Livre API
      |
      v
Produto
      |
      v
Gerador de artigo
      |
      v
WordPress API
      |
      v
Artigo publicado
```

## Links de afiliados

Cada oferta poderá armazenar:

```text
affiliateUrl
affiliateTag
```

Tags podem separar canais e campanhas:

```text
MNL-BLOG
MNL-INSTAGRAM
MNL-FACEBOOK
MNL-TIKTOK
MNL-COZINHA
MNL-REFORMA
```

A utilização de links deve respeitar as regras vigentes do programa de afiliados do Mercado Livre.

## Rastreamento

Fluxo futuro:

```text
ProductOffer
      |
      v
Affiliate Link
      |
      v
Click
      |
      v
Conversion
```

Modelo conceitual:

```prisma
model AffiliateClick {
  id             String   @id @default(cuid())
  productOfferId String
  source         String?
  campaign       String?
  createdAt      DateTime @default(now())

  productOffer ProductOffer @relation(fields: [productOfferId], references: [id])
}
```

Objetivo: descobrir quais produtos, categorias e canais geram melhores resultados.

## Segurança

Nunca armazenar no frontend:

```text
Client Secret
Access Token
Refresh Token
Cookie de sessão
CSRF Token
```

Não usar cookies ou tokens capturados do DevTools para automatizar o Portal de Afiliados.

## O que não fazer

- Não fazer scraping para substituir APIs oficiais.
- Não reutilizar cookies pessoais no backend.
- Não colocar CSRF token do navegador no `.env`.
- Não assumir que endpoint interno é API pública.
- Não solicitar permissões de vendedor desnecessárias.
- Não publicar em canais proibidos pelas regras do programa.
- Não criar afirmações de preço sem dados atuais.

## Status das integrações

| Integração | Status |
|---|---|
| Instagram | Token configurado |
| Facebook | API configurada/em desenvolvimento |
| TikTok Shop | Aplicação/API em configuração |
| Shopee | Aguardando acesso à Open API de Afiliados |
| Mercado Livre | Afiliado ativo + aplicação oficial em configuração |

## Roadmap

### Fase 1 — Mercado Livre API

- [x] Criar aplicação
- [x] Configurar permissões mínimas
- [x] Manter webhooks sem seleção
- [ ] Configurar OAuth
- [ ] Obter access token
- [ ] Testar consulta
- [ ] Testar pesquisa de produto
- [ ] Criar MercadoLivreProvider

### Fase 2 — Catálogo

- [ ] Product
- [ ] ProductOffer
- [ ] Normalização
- [ ] Deduplicação
- [ ] Categorias
- [ ] Atualização de preços

### Fase 3 — Afiliados

- [ ] Definir método oficialmente autorizado para geração de links
- [ ] Tags por canal
- [ ] Armazenamento de affiliateUrl
- [ ] Rastreamento
- [ ] Validação das regras do programa

### Fase 4 — Conteúdo

- [ ] Artigos
- [ ] Comparações
- [ ] Listas
- [ ] Reviews
- [ ] Recomendações

### Fase 5 — Distribuição

- [ ] WordPress
- [ ] Instagram
- [ ] Facebook
- [ ] TikTok
- [ ] Outros canais permitidos

### Fase 6 — Analytics

- [ ] Cliques
- [ ] Conversões
- [ ] Receita
- [ ] ROI por canal
- [ ] ROI por categoria
- [ ] Ranking de produtos

## Próximo passo técnico

Após finalizar o cadastro da aplicação:

1. configurar OAuth;
2. autorizar a conta;
3. obter access token;
4. testar uma chamada oficial;
5. pesquisar um produto;
6. normalizar o resultado;
7. salvar no PostgreSQL;
8. criar o MercadoLivreProvider;
9. integrar ao ProductOffer.

A API oficial do Mercado Livre será a fonte de dados do marketplace. A geração de links de afiliado permanecerá separada até existir um método oficial e autorizado para automatizá-la.
