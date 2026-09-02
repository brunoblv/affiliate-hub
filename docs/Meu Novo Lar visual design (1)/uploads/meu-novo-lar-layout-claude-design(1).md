# Meu Novo Lar — Especificação de Layout para Claude Design

## Objetivo

Projetar a interface pública do **Meu Novo Lar** como um portal editorial moderno sobre casa, compras, ofertas e ferramentas úteis.

O site não deve parecer um marketplace genérico nem um painel administrativo.

Proposta:

> **Conteúdo útil para a casa + produtos selecionados + ofertas + ferramentas práticas.**

Visitantes públicos não possuem conta e não fazem login. Somente o administrador utiliza `/admin`.

O layout deve nascer preparado para:
- SEO;
- Google AdSense;
- LGPD;
- cookies e consentimento;
- links de afiliados;
- boa performance;
- mobile-first;
- acessibilidade.

---

## 1. Arquitetura pública

```text
/
├── /blog
├── /blog/[slug]
├── /categoria/[slug]
├── /produtos
├── /produtos/[slug]
├── /ofertas
├── /ferramentas
├── /ferramentas/[slug]
├── /sobre
├── /contato
├── /terms
├── /privacy-policy
└── /admin/*
```

`/` deve ser a Home editorial, nunca uma tela de login.

Login somente em:

```text
/admin/login
```

---

## 2. Direção visual

Criar um design:
- moderno;
- editorial;
- elegante;
- acolhedor;
- limpo;
- premium sem ser excessivamente sofisticado;
- inspirado em portais modernos de lifestyle/home;
- excelente para leitura;
- muito bom no celular;
- com bastante espaço em branco;
- tipografia forte;
- imagens grandes;
- cards discretos;
- hierarquia visual clara.

Evitar:
- aparência de marketplace genérico;
- excesso de cards;
- excesso de bordas;
- gradientes exagerados;
- visual de dashboard;
- excesso de cores;
- banners invasivos;
- pop-ups constantes;
- aparência de dropshipping.

Identidade:

**Casa + confiança + utilidade + descoberta.**

---

## 3. Sistema visual

### Cores

Usar uma paleta neutra e sofisticada.

Base:
- fundo off-white;
- branco para superfícies;
- texto quase preto;
- cinza para textos secundários;
- cor principal quente e elegante;
- cor de destaque para ofertas.

Direção sugerida:

```text
Background: off-white
Surface: white
Text: charcoal
Muted: warm gray
Primary: terracotta / clay / earthy orange
Deal: green discreto
```

Não usar vermelho agressivo como cor predominante.

---

## 4. Tipografia

Usar combinação editorial moderna:

```text
Headings:
serifada moderna ou display elegante

Body:
sans-serif extremamente legível
```

Hierarquia forte entre H1/H2/H3/body.

Evitar fontes excessivamente decorativas.

---

## 5. Header

Desktop:

```text
┌─────────────────────────────────────────────────────────────┐
│ MEU NOVO LAR     Casa  Blog  Produtos  Ofertas  Ferramentas 🔍 │
└─────────────────────────────────────────────────────────────┘
```

Menu:
- Casa
- Blog
- Produtos
- Ofertas
- Ferramentas

Busca global.

Não exibir Login no header público.

Mobile:

```text
┌──────────────────────────────┐
│ ☰   MEU NOVO LAR       🔍    │
└──────────────────────────────┘
```

---

## 6. Home `/`

A Home deve funcionar como um portal editorial.

### Hero

Hero elegante e não excessivamente alto.

```text
┌──────────────────────────────────────────────────────────────┐
│ IDEIAS PARA O SEU LAR                                        │
│                                                              │
│ Inspiração, dicas, produtos e ferramentas para deixar        │
│ sua casa mais prática e bonita.                              │
│                                                              │
│ [ Explorar conteúdos ]   [ Ver ofertas ]                     │
│                                                              │
│                         imagem editorial grande               │
└──────────────────────────────────────────────────────────────┘
```

Pode destacar o artigo principal da semana.

### Destaques

Grid editorial com:
- artigo principal;
- artigo secundário;
- produto;
- oferta.

Priorizar imagens.

### Categorias

> Explore por categoria

- Casa
- Organização
- Cozinha
- Decoração
- Limpeza
- Jardim
- Ferramentas
- Tecnologia para casa

### Conteúdos recentes

Grid:
- desktop: 3 colunas;
- tablet: 2;
- mobile: 1.

Card:

```text
[ imagem ]

CATEGORIA

Título

Resumo curto

5 min de leitura
```

### Ofertas

> Ofertas que encontramos

Mostrar produtos com:
- preço anterior;
- preço atual;
- desconto;
- loja;
- CTA.

### Ferramentas

> Ferramentas para facilitar sua vida

Exemplos:
- Calculadora de tinta;
- Calculadora de piso;
- Calculadora de metragem;
- Lista de compras;
- Comparador de produtos.

### Newsletter

Não bloquear o conteúdo.

```text
Receba boas ideias para sua casa
Dicas, ferramentas e ofertas selecionadas.

[ seu@email.com ] [ Quero receber ]
```

Preparar para consentimento de marketing.

---

## 7. Blog `/blog`

O blog deve parecer uma revista digital.

Topo:

> **Blog**
>
> Conteúdos para deixar sua casa mais prática, bonita e funcional.

Categorias:

```text
Todos
Casa
Organização
Cozinha
Decoração
Limpeza
Jardim
Ferramentas
Compras
```

Estrutura:
- artigo destaque;
- recentes;
- listas;
- guias;
- comparativos.

---

## 8. Página de artigo

URL:

```text
/blog/[slug]
```

Estrutura:

```text
Categoria

Título grande

Resumo

Data • tempo de leitura

Imagem principal

Conteúdo

Produtos relacionados

Ofertas relacionadas

Artigos relacionados
```

Largura ideal do texto: aproximadamente 680–760px.

Adicionar:
- breadcrumbs;
- índice em artigos longos;
- imagens;
- subtítulos;
- listas;
- tabelas quando úteis;
- links internos;
- CTA contextual.

---

## 9. Produtos `/produtos`

Não parecer uma loja tradicional.

Título:

> **Produtos selecionados para sua casa**

Subtítulo:

> Encontramos produtos interessantes nas principais lojas para facilitar sua escolha.

Filtros:
- categoria;
- faixa de preço;
- loja;
- promoção;
- avaliação;
- recentes.

Card:

```text
Imagem

Categoria

Nome

Avaliação

R$ preço

[ Ver produto ]
```

Aviso discreto quando aplicável:

> Podemos receber uma comissão por compras realizadas através de alguns links.

---

## 10. Ofertas `/ofertas`

Título:

> **Ofertas para sua casa**

Filtros:
- categoria;
- desconto;
- faixa de preço;
- loja.

Card deve mostrar:
- preço anterior;
- preço atual;
- percentual;
- data de atualização;
- loja;
- CTA.

Exibir:

> Atualizado hoje às 09:15

Não afirmar que uma oferta continua válida sem confirmação recente.

---

## 11. Ferramentas `/ferramentas`

Diretório de utilidades.

Categorias:
- Construção;
- Casa;
- Organização;
- Compras;
- Finanças;
- Conversores.

Exemplos:
- calculadora de tinta;
- calculadora de piso;
- calculadora de metragem;
- comparador;
- lista de compras;
- conversores.

As ferramentas funcionam sem login.

---

## 12. Busca

Criar:

```text
/busca?q=tinta
```

Pesquisar:
- artigos;
- produtos;
- categorias;
- ferramentas.

Resultados separados por tipo.

---

## 13. Footer

```text
MEU NOVO LAR

Conteúdo, produtos, ofertas e
ferramentas para sua casa.

CONTEÚDO
Blog
Categorias
Produtos
Ofertas

FERRAMENTAS
Todas as ferramentas

INFORMAÇÕES
Sobre
Contato
Termos de Uso
Política de Privacidade

REDES
Pinterest
Facebook
Instagram
Telegram

© 2026 Meu Novo Lar
```

Não colocar redes que ainda não existam.

---

## 14. Área administrativa

Separada do site público:

```text
/admin/login
/admin
```

Somente o administrador acessa.

Não mostrar links para admin no site público.

Estrutura futura:

```text
Dashboard
Conteúdo
├── Posts
├── Produtos
├── Ofertas
├── Categorias
└── Mídia

Afiliados
├── Mercado Livre
├── Shopee
├── Amazon
└── Outros

Automação
├── Coleta
├── Regras
├── Publicações
├── Facebook
├── Pinterest
└── Blog

Ferramentas
Configurações
Logs
```

---

# 15. AdSense

Preparar o design para monetização sem destruir a experiência.

Criar componente reutilizável:

```text
<AdSlot position="home-top" />
<AdSlot position="home-inline" />
<AdSlot position="article-inline" />
<AdSlot position="article-bottom" />
<AdSlot position="sidebar" />
```

Possíveis posições:

Home:
- após destaques;
- entre blocos editoriais;
- próximo ao final.

Artigos:
- após introdução, quando adequado;
- entre blocos de conteúdo;
- antes de conteúdo relacionado.

Não colocar anúncios:
- sobre texto;
- cobrindo botões;
- em excesso;
- de forma que pareçam conteúdo editorial.

O layout deve funcionar perfeitamente mesmo sem anúncios.

Reservar dimensões dos slots para evitar CLS.

---

# 16. LGPD e cookies

Preparar componentes:

```text
CookieConsent
CookiePreferences
PrivacySettings
```

O visitante deve poder:
- aceitar todos;
- rejeitar não essenciais;
- configurar preferências.

Categorias:

```text
Necessários
Analytics
Publicidade
Marketing
```

Não ativar cookies não essenciais antes do mecanismo de consentimento correspondente.

Não usar dark patterns.

---

## 17. Banner de cookies

Visual discreto:

```text
┌────────────────────────────────────────────────────────────┐
│ 🍪 Sua privacidade importa                                │
│                                                            │
│ Usamos cookies necessários e, quando autorizado, cookies   │
│ para análise e publicidade.                                │
│                                                            │
│ [ Configurar ] [ Recusar ] [ Aceitar ]                     │
└────────────────────────────────────────────────────────────┘
```

`Recusar` deve ter destaque equivalente a `Aceitar`.

---

## 18. `/privacy-policy`

Layout editorial jurídico.

```text
Política de Privacidade

Última atualização: [data]

1. Introdução
2. Dados coletados
3. Como usamos os dados
4. Cookies
5. Publicidade
6. Afiliados
7. Serviços de terceiros
8. Compartilhamento
9. Segurança
10. Direitos do titular
11. Retenção
12. Contato
13. Alterações
```

Adicionar índice lateral no desktop e índice colapsável no mobile.

O conteúdo jurídico definitivo deve ser revisado conforme as práticas reais do sistema.

---

## 19. `/terms`

```text
Termos de Uso

Última atualização: [data]

1. Aceitação
2. Sobre o Meu Novo Lar
3. Conteúdo
4. Produtos e preços
5. Links de afiliados
6. Ferramentas
7. Links externos
8. Limitação de responsabilidade
9. Propriedade intelectual
10. Uso proibido
11. Alterações
12. Contato
```

---

# 20. Afiliados

Preparar suporte para:
- Mercado Livre;
- Shopee;
- Amazon;
- outras plataformas futuramente.

O frontend deve indicar claramente a origem do produto.

Exemplo:

```text
Loja:
Mercado Livre

[ Ver no Mercado Livre ]
```

Não simular checkout dentro do Meu Novo Lar.

O usuário é encaminhado ao marketplace.

Aviso reutilizável:

> **Transparência:** alguns links deste site são links de afiliados. Isso significa que podemos receber uma comissão quando uma compra é realizada através deles, sem custo adicional para você.

---

# 21. SEO

Toda página deve suportar:

```text
title
meta description
canonical
Open Graph
Twitter/X card
robots
structured data
```

Criar:

```text
/sitemap.xml
/robots.txt
```

Usar URLs amigáveis:

```text
/blog/como-escolher-tinta
```

e não:

```text
/post?id=183
```

Structured data quando aplicável:
- Article;
- Product;
- BreadcrumbList;
- tipos adequados para ferramentas.

Nunca gerar dados estruturados falsos.

---

# 22. Performance

Prioridades:
- imagens otimizadas;
- lazy loading;
- formatos modernos;
- pouco JavaScript;
- fontes otimizadas;
- evitar bibliotecas pesadas;
- Core Web Vitals;
- evitar CLS;
- carregamento rápido no mobile.

AdSense não deve deixar o layout instável.

---

# 23. Responsividade

Desktop:
- layout editorial amplo;
- sidebar opcional;
- grids.

Tablet:
- 2 colunas.

Mobile:
- 1 coluna;
- menu compacto;
- cards horizontais quando apropriado;
- botões grandes;
- texto confortável.

Mobile deve ser prioridade.

---

# 24. Componentes

Criar componentes reutilizáveis:

```text
Header
MobileMenu
Footer
Search
Hero
ArticleCard
FeaturedArticle
ProductCard
DealCard
ToolCard
CategoryCard
Breadcrumbs
ArticleTOC
AffiliateDisclosure
AdSlot
CookieConsent
CookiePreferences
Newsletter
Pagination
PriceDisplay
DiscountBadge
StoreBadge
RelatedContent
```

---

# 25. UX

1. O usuário deve entender o site em poucos segundos.
2. Conteúdo é prioridade.
3. Produtos complementam o conteúdo.
4. Ofertas são fáceis de encontrar.
5. Ferramentas são acessíveis.
6. Não exigir cadastro.
7. Não exigir login.
8. Não usar pop-ups agressivos.
9. Links de privacidade sempre acessíveis.
10. Não usar dark patterns.
11. Não confundir anúncio com conteúdo.
12. Não exagerar em CTAs.

---

# 26. Fluxo de conversão

```text
                    HOME
                      │
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
     BLOG          OFERTAS       FERRAMENTAS
       │              │              │
       ↓              ↓              ↓
   PRODUTOS        PRODUTOS       PRODUTOS
       │              │              │
       └──────────────┴──────────────┘
                      ↓
             Marketplace externo
```

Princípio:

> Resolver um problema do usuário e, quando fizer sentido, apresentar um produto útil.

---

# 27. Prioridade para protótipo no Claude Design

## Prioridade 1

1. Home `/`
2. Blog `/blog`
3. Artigo `/blog/[slug]`
4. Produtos `/produtos`
5. Ofertas `/ofertas`
6. Ferramentas `/ferramentas`

## Prioridade 2

7. Página de produto
8. Página de ferramenta
9. Busca
10. Categoria

## Prioridade 3

11. Sobre
12. Contato
13. Terms
14. Privacy Policy
15. Cookie Preferences

Não desenvolver o admin nesta etapa.

---

# 28. Estados

Criar também:
- loading;
- skeleton;
- empty state;
- erro;
- produto sem imagem;
- produto sem preço;
- oferta expirada;
- nenhum resultado de busca;
- ferramenta indisponível;
- anúncio não carregado.

---

# 29. Princípio central

> **Conteúdo primeiro. Utilidade em segundo. Monetização em terceiro.**

Ads, afiliados e promoções devem existir dentro da experiência, mas nunca dominar a experiência.

O site precisa continuar útil mesmo que o usuário não clique em nenhum produto.

---

# 30. Entrega esperada do Claude Design

Gerar:
1. Design system;
2. tokens de cores;
3. tipografia;
4. componentes;
5. Home desktop/mobile;
6. Blog desktop/mobile;
7. Artigo desktop/mobile;
8. Produtos desktop/mobile;
9. Ofertas desktop/mobile;
10. Ferramentas desktop/mobile;
11. Busca;
12. Terms;
13. Privacy Policy;
14. Cookie banner;
15. Cookie preferences;
16. loading states;
17. empty states;
18. error states;
19. componentes de anúncio;
20. componentes de afiliados.

O resultado deve parecer um **portal editorial moderno e confiável**, combinando:

```text
REVISTA DIGITAL
       +
PORTAL DE UTILIDADES
       +
CURADORIA DE PRODUTOS
       +
OFERTAS
```

O visitante deve conseguir entrar, ler um artigo, usar uma ferramenta ou descobrir um produto sem criar conta.

**Não criar login para usuários públicos.**

---

## Nota jurídica

As páginas `/terms` e `/privacy-policy` devem receber conteúdo jurídico definitivo posteriormente, conforme as práticas reais de coleta de dados, cookies, analytics, publicidade e afiliados utilizadas pelo sistema.

O protótipo deve preparar a estrutura, mas não inventar declarações sobre tratamentos de dados que ainda não existem.
