Affiliate Hub — Especificações para AdSense desde o Dia 1

1. Objetivo

O Affiliate Hub deve nascer preparado para monetização com Google AdSense sem depender de uma futura reestruturação do projeto.

O princípio central é:

O site não deve ser apenas uma ponte entre o Google, uma lista de preços e um link afiliado.

O Affiliate Hub deve funcionar como uma plataforma de inteligência de preços e apoio à decisão de compra, combinando:

comparação de preços;

histórico de preços;

análise do preço atual;

dados e especificações do produto;

alertas de queda de preço;

tendências;

conteúdo de apoio;

links afiliados;

publicidade via AdSense.

A monetização deve ser consequência do valor entregue ao usuário, e não o foco principal da página.

2. Princípio de qualidade

Toda página indexável deve responder positivamente à seguinte pergunta:

Se os links das lojas forem removidos, esta página ainda continua útil para o usuário?

Se a resposta for não, a página ainda não possui valor suficiente para ser indexada ou monetizada.

A estrutura ideal é:

Produto + comparação de preços + histórico + análise + informações + contexto + alertas

3. Página de produto

Exemplo:

/produto/iphone-17-pro-256gb

A página de produto será a principal página do Affiliate Hub.

3.1. Cabeçalho do produto

Deve conter:

imagem principal;

nome completo;

marca;

categoria;

principais características;

menor preço atual;

quantidade de lojas encontradas;

data/hora da última atualização;

botão para criar alerta.

Exemplo:

Apple iPhone 17 Pro 256 GB

Menor preço encontrado: R$ 7.899

Comparado em 6 lojas
Atualizado hoje às 12:42

[Criar alerta de preço]

4. Comparador de preços

A tabela principal deve ajudar o usuário a tomar uma decisão real de compra.

Exemplo:

Loja

Preço

Frete

Total

Atualizado

Ação

Amazon

R$ 7.899

grátis

R$ 7.899

há 20 min

Ver oferta

Mercado Livre

R$ 7.950

grátis

R$ 7.950

há 1h

Ver oferta

Shopee

R$ 8.099

R$ 19

R$ 8.118

há 34 min

Ver oferta

Evitar uma estrutura simplista como:

Amazon — R$ 7.899 — Comprar

Sempre que possível, incluir:

preço no PIX;

preço parcelado;

quantidade de parcelas;

frete;

disponibilidade;

vendedor;

marketplace;

cupom conhecido;

cashback, quando verificável;

preço total efetivo.

5. Links afiliados

Os links afiliados precisam ser transparentes.

O usuário deve saber que será direcionado para uma loja externa.

Preferir:

Ver oferta na Amazon

Evitar CTAs excessivamente agressivos como:

COMPRAR AGORA!!!

Deve existir uma informação clara próxima ao comparador:

Alguns links desta página são links de afiliados. O Affiliate Hub pode receber uma comissão caso você realize uma compra, sem custo adicional para você.

6. Histórico de preços

O histórico de preços deve ser uma das funcionalidades centrais do Affiliate Hub.

Permitir visualização por:

30 dias
90 dias
6 meses
1 ano

6.1. Dados mínimos

Registrar no banco:

product
store
affiliate_link
price
cash_price
shipping_price
captured_at
availability

6.2. Indicadores derivados

Mostrar:

preço atual;

menor preço do período;

maior preço;

preço médio;

variação percentual;

última alteração.

Exemplo:

Preço atual
R$ 1.899

Menor preço em 90 dias
R$ 1.799

Preço médio
R$ 2.154

Maior preço
R$ 2.499

7. Inteligência sobre o preço

O Affiliate Hub deve interpretar seus próprios dados.

Exemplo:

Situação do preço

Preço muito baixo

O preço atual está 18% abaixo da média dos últimos 90 dias.

Ou:

Preço normal

O produto está próximo da média histórica.

Ou:

Preço alto

O preço atual está 12% acima da média dos últimos 90 dias.

Esses indicadores devem ser calculados usando o histórico real do produto.

Evitar textos genéricos produzidos apenas por IA.

8. Seção "O preço está bom?"

A página deve responder diretamente se o valor atual está acima ou abaixo de seu histórico.

Exemplo:

O preço está bom?

O menor preço atual é R$ 1.899. Nos últimos 90 dias, este produto custou em média R$ 2.154 e chegou ao menor valor de R$ 1.799.

O preço atual está aproximadamente 12% abaixo da média do período.

Essa informação deve ser baseada nos dados próprios do Affiliate Hub.

9. Histórico recente de alterações

Mostrar as últimas mudanças:

23 set
R$ 1.899 ↓ 5%

21 set
R$ 1.999

18 set
R$ 2.099 ↓ 4%

15 set
R$ 2.199

Isso acrescenta valor informacional à página sem depender de textos artificiais.

10. Alertas de preço

O usuário deve poder informar um preço desejado.

Exemplo:

Me avise quando custar menos de:

R$ 1.800

Canais iniciais:

e-mail;

push web.

Possíveis canais futuros:

WhatsApp;

Telegram;

app.

Exemplo de alerta:

O produto que você acompanha caiu de R$ 1.999 para R$ 1.799.

[Ver oferta]

O código do AdSense não deve ser colocado dentro de e-mails, mensagens, notificações ou alertas externos ao site.

11. Conteúdo próprio na página do produto

A página deve conter conteúdo original e útil.

Evitar copiar integralmente descrições da Amazon, Mercado Livre, Shopee ou fabricante.

11.1. Estrutura sugerida

Sobre o produto

Resumo objetivo e original.

Principais características

tela;

processador;

armazenamento;

dimensões;

capacidade;

material;

garantia;

etc.

Pontos fortes

Baseados em características objetivas.

Pontos de atenção

Também objetivos.

Para quem este produto faz sentido

Exemplo:

Este modelo é voltado principalmente para quem procura uma TV intermediária de 55", com resolução 4K e acesso aos principais serviços de streaming.

Evitar linguagem publicitária genérica como:

Transforme sua sala em uma experiência cinematográfica inesquecível.

12. Dados estruturados por categoria

Cada categoria deve possuir atributos próprios.

Smartphone

Tela
Processador
RAM
Armazenamento
Bateria
Câmeras
5G
NFC
Sistema operacional

Geladeira

Capacidade
Número de portas
Frost Free
Consumo energético
Dimensões
Voltagem

Tênis

Marca
Modelo
Material
Tipo
Numeração
Uso indicado

Isso melhora:

comparação;

SEO;

experiência do usuário;

qualidade da página;

estrutura semântica.

13. Comparação entre produtos

Criar suporte para comparações.

Exemplo:

/comparar/iphone-17-vs-galaxy-s26

Também permitir seleção dinâmica.

Exemplo:

☑ Galaxy S26
☑ iPhone 17
☑ Xiaomi 16

[Comparar]

Exemplo de tabela:

Atributo

Galaxy S26

iPhone 17

Menor preço

R$ ...

R$ ...

Tela

...

...

Armazenamento

...

...

Histórico

...

...

14. Página de busca

Exemplo:

/buscar?q=smart-tv

A página deve oferecer:

busca;

filtros;

produtos;

menor preço;

quantidade de lojas;

variação recente;

indicador de preço.

Pesquisas internas arbitrárias não devem ser indexadas.

Exemplo:

<meta name="robots" content="noindex, follow">

Evitar indexação de milhares de combinações como:

/buscar?q=tv
/buscar?q=tv55
/buscar?q=tv+barata

15. Categorias indexáveis

Categorias planejadas podem ser indexadas.

Exemplo:

/celulares
/televisores
/eletrodomesticos
/moveis
/moda-feminina
/construcao
/beleza

Cada categoria deve conter:

título;

introdução original;

produtos;

filtros;

marcas;

estatísticas;

produtos com maior queda;

produtos mais acompanhados;

ofertas recentes.

Evitar categoria composta apenas por uma grade de produtos.

16. Página de ofertas

Criar:

/ofertas

As ofertas devem seguir critérios objetivos.

Exemplo:

Maiores quedas de preço hoje

Produto X — -31%
Produto Y — -27%
Produto Z — -23%

A classificação deve ser baseada em dados históricos do site.

Evitar chamar arbitrariamente qualquer link afiliado de "oferta".

17. Página de menor preço histórico

Criar:

/menor-preco

Exemplo de critério:

current_price <= historical_minimum

Ou utilizar uma tolerância configurável.

Exemplo de conteúdo:

43 produtos atingiram hoje o menor preço registrado pelo Affiliate Hub.

18. Página de tendências

Criar:

/tendencias

Possíveis seções:

mais pesquisados;

mais acompanhados;

maiores quedas de preço;

produtos com preços subindo;

categorias em alta;

produtos com maior número de alertas.

Os dados devem vir do próprio Affiliate Hub.

19. Guias de compra

Criar:

/guias

Não existe necessidade de publicar uma quantidade arbitrária de artigos apenas para o AdSense.

A prioridade é qualidade e utilidade.

Sugestões iniciais:

Como funciona o histórico de preços

Como saber se uma promoção é realmente boa

PIX ou parcelado: como comparar o preço real

Como funcionam preços em marketplaces

Como criar alertas de preço

Como comparar vendedores

Como interpretar o histórico de preços

Posteriormente, criar guias específicos por categoria.

20. Páginas institucionais

Criar desde a primeira versão:

/sobre
/como-funciona
/contato
/politica-de-privacidade
/politica-de-cookies
/termos-de-uso
/afiliados
/guias

Sobre

Explicar:

o que é o Affiliate Hub;

qual problema resolve;

como os preços são obtidos;

como o site funciona;

relação com lojas e marketplaces.

Como funciona

Explicar:

coleta de preços;

normalização dos produtos;

comparação entre lojas;

armazenamento de histórico;

detecção de variações;

geração de alertas.

Afiliados

Explicar de forma clara:

O Affiliate Hub participa de programas de afiliados. Podemos receber comissão pelas compras realizadas através de alguns links apresentados no site.

21. Política de privacidade e cookies

Preparar desde o início para:

Google Analytics;

Google AdSense;

login;

alertas;

e-mail;

cookies;

armazenamento local;

programas de afiliados;

pixels e scripts de terceiros.

Deixar a arquitetura pronta para CMP e gestão de consentimento.

22. Slots de anúncios

O layout deve nascer preparado para publicidade.

Exemplo:

<ProductHeader />

<PriceComparison />

<AdSlot id="product-after-prices" />

<PriceHistory />

<PriceAnalysis />

<AdSlot id="product-after-history" />

<ProductDetails />

<RelatedProducts />

Antes da aprovação no AdSense:

AdSlot -> não renderiza nada

Não mostrar espaços vazios com textos como:

Espaço para publicidade

23. Posições sugeridas para anúncios

Desktop

Produto
↓
Comparação de preços
↓
[ANÚNCIO]
↓
Histórico
↓
Análise
↓
[ANÚNCIO]
↓
Detalhes

Opcionalmente:

Sidebar sticky

Desde que não prejudique navegação ou leitura.

Mobile

Evitar anúncios imediatamente ao lado de:

Ver oferta
Comprar
Criar alerta

Deve existir distância visual suficiente para reduzir risco de clique acidental.

24. Separação entre anúncio e oferta

Nunca apresentar anúncios como se fossem ofertas ou lojas.

Evitar:

OFERTAS RECOMENDADAS

[ADSENSE]

Evitar:

Comprar agora

[ADSENSE]

Anúncios e ofertas comerciais devem ter identidades visuais claramente separadas.

25. Densidade de anúncios

Regra do projeto:

Conteúdo é sempre prioridade sobre publicidade.

Evitar estruturas como:

HEADER
ADS
ADS
produto
ADS
comparador
ADS

O site deve parecer primeiro uma ferramenta útil e depois uma plataforma monetizada.

26. Páginas sem anúncios

Criar uma função central:

shouldShowAds(route, pageData)

Não mostrar anúncios em:

/login
/cadastro
/conta
/configuracoes
/alertas
/esqueci-senha
/admin

Também não mostrar em:

produto sem preço;

produto incompleto;

página vazia;

erro 404;

erro 500;

página em construção;

resultados sem conteúdo;

páginas administrativas.

27. Elegibilidade para SEO

Criar uma regra de qualidade antes de uma página ser indexável.

Exemplo:

product.seoEligible =
  hasName &&
  hasImage &&
  hasDescription &&
  hasCategory &&
  hasSpecifications &&
  activeOffers >= 1 &&
  priceHistoryDays >= MIN_HISTORY;

Se não cumprir:

<meta name="robots" content="noindex,follow">

Quando estiver completa:

<meta name="robots" content="index,follow">

28. Elegibilidade para anúncios

Criar uma regra separada.

Exemplo:

product.adsEligible =
  product.seoEligible &&
  originalContentLength >= threshold &&
  activeOffers >= 1;

Uma página recém-criada ou incompleta não deve receber publicidade automaticamente.

29. Produtos indisponíveis

Não excluir automaticamente.

Quando ainda existir valor:

Produto atualmente sem ofertas disponíveis.

Mostrar:

histórico;

especificações;

alternativas;

produtos relacionados.

Se a página ficar praticamente sem conteúdo, não exibir anúncios.

Quando o produto deixar de existir definitivamente:

410 Gone

Ou realizar redirecionamento quando houver um sucessor claramente equivalente.

30. Produtos duplicados

Normalizar produtos equivalentes.

Exemplo:

Samsung TV QN90
Samsung QN90 55
Smart TV Samsung 55 QN90
QN90 Samsung

Não criar quatro páginas.

Modelo ideal:

CanonicalProduct
    ├── AmazonOffer
    ├── MercadoLivreOffer1
    ├── MercadoLivreOffer2
    ├── ShopeeOffer
    └── MagazineLuizaOffer

Um produto canônico pode ter várias ofertas.

31. SEO técnico

Implementar desde o primeiro commit:

sitemap.xml
robots.txt
canonical
OpenGraph
Twitter Cards
structured data
breadcrumbs

Structured data quando aplicável:

Product
Offer
AggregateOffer
BreadcrumbList
Article
Organization
WebSite

Nunca colocar dados estruturados que não correspondam ao conteúdo visível da página.

32. Sitemap seletivo

Separar sitemaps:

/sitemap-products.xml
/sitemap-categories.xml
/sitemap-guides.xml

Um produto só deve entrar no sitemap quando:

seoEligible === true

33. Conteúdo gerado por IA

IA pode auxiliar na produção e organização do conteúdo.

Não utilizar IA para criar milhares de páginas praticamente idênticas.

Exemplo ruim:

O iPhone 17 é uma excelente opção para quem procura iPhone 17...

O iPhone 17 Pro é uma excelente opção para quem procura iPhone 17 Pro...

O valor principal da página deve vir de:

preço;

histórico;

especificações;

comparação;

dados;

comportamento;

análises quantitativas.

IA pode transformar dados reais em explicações mais legíveis.

34. Atualização dos preços

Mostrar sempre a última atualização da oferta.

Exemplo:

Atualizado há 37 minutos

Quando estiver velho:

Última verificação há 18 horas

Evitar classificar um preço antigo como:

Melhor oferta

quando o valor não tiver sido verificado recentemente.

35. Arquitetura de ofertas

Exemplo:

Offer {
  id
  productId
  merchantId

  url
  affiliateUrl

  currentPrice
  cashPrice
  previousPrice
  shippingPrice

  availability

  lastCheckedAt
  lastSuccessfulCheckAt

  source
}

Histórico:

PriceHistory {
  offerId
  price
  shippingPrice
  capturedAt
}

36. Indicador de confiabilidade do preço

Permitir labels como:

Preço verificado há 13 min

ou:

Preço possivelmente desatualizado

Nunca esconder do usuário que um preço pode estar antigo.

37. Core Web Vitals

A publicidade não deve causar instabilidade visual.

Reservar espaço para anúncios.

Exemplo:

.ad-slot {
  min-height: 250px;
}

Implementar:

dimensões fixas para imagens;

lazy loading;

SSR/ISR quando adequado;

cache;

CDN;

redução de JavaScript;

otimização de fontes;

prevenção de CLS;

otimização de LCP;

redução de INP.

38. Faceted navigation

Filtros não devem criar infinitas URLs indexáveis.

Exemplo:

?brand=samsung
?brand=samsung&price=1000
?brand=samsung&price=1000&sort=asc

Controlar com:

canonical
robots
noindex

39. ads.txt

Preparar suporte para:

/ads.txt

Após criação da conta do AdSense:

google.com, pub-XXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0

40. Configuração central de publicidade

Criar uma configuração única.

Exemplo:

export const adsConfig = {
  enabled: false,

  provider: "adsense",

  slots: {
    productAfterPrices: true,
    productAfterHistory: true,
    categoryFeed: true,
    desktopSidebar: true,
  },
};

Após aprovação:

enabled: true

Evitar lógica de anúncio espalhada por dezenas de componentes.

41. Analytics

Separar os eventos de negócio.

Afiliados

affiliate_offer_view
affiliate_click
price_alert_created

Produto

product_view
price_chart_view
comparison_created

Regras

Nunca:

incentivar clique em anúncios;

criar eventos para estimular clique em AdSense;

posicionar anúncio como se fosse CTA;

usar elementos visuais que confundam anúncio com oferta.

42. Estrutura da homepage

Hero

Compare preços antes de comprar.

[ O que você está procurando? ]

Oportunidades de hoje

Produtos cujo preço realmente caiu.

Menores preços históricos

Baseados nos próprios dados.

Mais acompanhados

Baseados no comportamento dos usuários.

Categorias

Exemplo:

Eletrônicos
Casa
Móveis
Construção
Moda
Beleza

Como funciona

Pesquisar → comparar → acompanhar → comprar

Guias recentes

Exibir de 3 a 4 conteúdos relevantes.

43. Histórico como ativo estratégico

O histórico de preços deve ser tratado como um dos principais ativos do Affiliate Hub.

Com o tempo, a plataforma poderá gerar informações exclusivas como:

Este produto ficou abaixo de R$ 2.000 em apenas 8 dos últimos 180 dias.

O preço costuma cair nas últimas semanas de novembro.

Esta é a segunda menor cotação registrada nos últimos seis meses.

Isso diferencia o Affiliate Hub de um simples agregador de afiliados.

44. Workflow de publicação

Criar um status interno para produtos.

Exemplo:

DRAFT
   ↓
IMPORTADO
   ↓
ENRIQUECENDO
   ↓
PRONTO
   ↓
PUBLICADO

Somente produtos PUBLICADO:

aparecem na busca;

aparecem nas categorias;

entram no sitemap;

podem ser indexados;

podem se tornar elegíveis para AdSense.

45. Content Quality Score

Criar uma pontuação interna de qualidade.

Exemplo:

Critério

Pontos

Nome

5

Descrição original

15

Imagem

10

Categoria

5

Especificações

15

Oferta válida

15

Múltiplas lojas

10

Histórico de preço

15

Análise de preço

5

Produtos relacionados

5

Total

100

Regras sugeridas:

< 50
noindex + sem ads

50–69
indexação opcional + sem ads

>= 70
indexável

>= 80
elegível para AdSense

Essa pontuação é uma regra interna do Affiliate Hub, não uma exigência do Google.

46. Regras de publicação automática

Exemplo:

const qualityScore = calculateProductQuality(product);

product.seoEligible = qualityScore >= 70;
product.adsEligible = qualityScore >= 80;

Também considerar:

product.adsEligible =
  product.seoEligible &&
  product.activeOffers >= 1 &&
  product.hasOriginalContent &&
  product.hasUsefulContent;

47. O que evitar

Não fazer:

milhares de produtos importados sem conteúdo;

descrições copiadas integralmente das lojas;

categorias vazias;

páginas automáticas para todas as combinações de filtros;

páginas de oferta sem histórico;

textos artificiais criados apenas para aumentar quantidade de palavras;

excesso de banners;

anúncios imediatamente ao lado de CTAs;

pop-ups agressivos;

páginas praticamente vazias;

páginas cujo único objetivo seja redirecionar para links afiliados.

48. Arquitetura conceitual

                    AFFILIATE HUB

              ┌─────────────────┐
              │    CONTEÚDO     │
              │ Guias / análises│
              └────────┬────────┘
                       │
       ┌───────────────┴──────────────┐
       │                              │
┌──────▼──────┐                ┌──────▼──────┐
│ COMPARAÇÃO  │                │INTELIGÊNCIA │
│ lojas/preços│                │ histórico   │
│ frete/Pix   │                │ tendências  │
└──────┬──────┘                │ alertas     │
       │                       └──────┬──────┘
       └───────────────┬──────────────┘
                       │
                ┌──────▼──────┐
                │ MONETIZAÇÃO │
                │ Afiliados   │
                │ AdSense     │
                └─────────────┘

A ordem deve ser sempre:

Valor → Conteúdo → Utilidade → Monetização

49. Checklist mínimo antes de solicitar AdSense

Estrutura

Homepage completa

Busca funcional

Categorias úteis

Produtos canônicos

Comparador funcionando

Histórico funcionando

Alertas funcionando

Página Sobre

Página Como Funciona

Página Contato

Política de Privacidade

Política de Cookies

Termos de Uso

Divulgação de links afiliados

SEO

sitemap.xml

robots.txt

canonicals

structured data

breadcrumbs

URLs limpas

noindex em busca interna

controle de filtros

produtos incompletos fora do sitemap

Content Quality Score ativo

Qualidade

Conteúdo original nas páginas principais

Dados históricos reais

Nenhuma página praticamente vazia

Nenhum produto duplicado indexável

Preços com data de atualização

Páginas úteis mesmo sem links afiliados

Navegação clara

Site responsivo

Core Web Vitals aceitáveis

AdSense

Slots de anúncio implementados

Slots inicialmente desabilitados

adsConfig centralizado

adsEligible implementado

Nenhum anúncio em login/admin/configurações

Distância segura entre anúncios e CTAs

Layout não depende de publicidade

ads.txt preparado

CMP preparada

Consentimento preparado

Política de privacidade preparada para AdSense

50. Princípio final

O Affiliate Hub não deve ser desenvolvido como:

Produto → preço → link afiliado

Ele deve ser desenvolvido como:

Produto
↓
Informações
↓
Comparação
↓
Histórico
↓
Inteligência
↓
Alertas
↓
Decisão de compra
↓
Monetização

O objetivo é fazer o site nascer preparado para AdSense desde a arquitetura inicial, evitando a necessidade futura de "corrigir o site para monetização".

O Affiliate Hub deve possuir valor próprio suficiente para continuar útil mesmo que todos os anúncios e links afiliados sejam temporariamente removidos.