# Descoberta automática de produtos e vitrines por loja

Especificação de duas mudanças que estendem os requisitos existentes:

- **RF-16 — Descoberta automática diária**: uma rodada por dia encontra candidatos na Shopee e no AliExpress, filtra por qualidade real (vendas, avaliação, marca), importa como rascunho e procura o mesmo produto nas outras lojas.
- **RF-17 — Vitrines por loja**: uma página por loja (`/loja/shopee`, `/loja/aliexpress`, e qualquer loja que venha a ter oferta pública) com achados do dia, mais vendidos e melhores ofertas, mais seções separando produto de marca de produto genérico.

Nada aqui muda o conceito central do catálogo (RF-01 a RF-03): continua **produto canônico → variação → oferta por loja**, preço em centavos, e só oferta com link de afiliado ativo aparece em público.

---

## Parte 0 — Resumo

**Hoje** a descoberta é manual e só Shopee: `/admin/candidatos` chama `lib/discovery/shopee.ts` (busca `productOfferV2` por palavra-chave, categoria ou loja), pontua em `lib/discovery/score.ts`, e `importCandidates` cria o rascunho e tenta casar com o Mercado Livre (`lib/discovery/ml-match.ts`). Há também `scripts/import-feed.ts` para carga em massa do Datafeed CSV. Nada disso roda sozinho, nada fica registrado entre sessões (o candidato vive só no HTML da página) e o AliExpress tem conector de **preço**, não de **busca**.

**Depois da mudança:**

1. A descoberta passa a ser uma capacidade do *conector* (como `fetchOffer` já é), não um módulo só da Shopee. Shopee e AliExpress implementam `searchCandidates`; o Mercado Livre fica de fora por ora, porque não tem API de link de afiliado (decisão 3).
2. Candidatos passam a ser **persistidos** (`ProductCandidate`) e cada rodada fica registrada (`DiscoveryRun`). Isso é o que permite rodar todo dia sem repetir trabalho, medir o que a filtragem descarta e ajustar os pesos com dados.
3. O filtro de qualidade ganha uma dimensão nova: **marca conhecida vs. genérico**, com tabela de marcas e cotas por rodada. Genérico não é descartado — é classificado, e a vitrine separa os dois.
4. A correspondência entre lojas é generalizada para **Shopee ↔ AliExpress**: um produto achado numa procura o equivalente na outra. Vínculo automático só com marca + modelo batendo (regra atual de `isAutoMatch`); o resto vai para a fila de Correspondências. O Mercado Livre fica exatamente como está hoje, até a engenharia reversa do link de afiliado.
5. A vitrine por loja ganha os dados que hoje não existem no banco: número de vendas e nota do anúncio (`Offer.salesCount`, `Offer.ratingCentis`) e uma seleção diária congelada (`ShowcaseEntry`), para a página poder dizer "achados de hoje" e ser verdade.

**O que *não* muda:** produto nasce `DRAFT` e **fica** `DRAFT`. O portão de publicação automática é construído, mas entra desligado e assim permanece até as cotas estarem afinadas com dados reais (seção A.9). O alvo de volume é **50 produtos importados por dia**.

---

## Parte A — Descoberta automática diária (RF-16)

### A.1 Fontes e o que cada uma entrega

| Fonte | Método | Serve para | Dá vendas? | Dá nota? | Dá link de afiliado? |
|---|---|---|---|---|---|
| Shopee Affiliate API | `productOfferV2` (keyword / `productCatId` / `shopId`, `sortType`) | descoberta contínua | sim (`sales`) | sim (`ratingStar`) | sim (`offerLink`) |
| Shopee Datafeed (CSV) | arquivo | carga em massa, varredura mensal | não | sim (`item_rating`, `shop_rating`, `like`) | **não** (o `product_short link` não carrega o código de afiliado) |
| AliExpress Open Platform | `aliexpress.affiliate.product.query` e `.hotproduct.query` | descoberta contínua | sim (`lastest_volume`, 30 dias) | sim (`evaluate_rate`, % positivo) | sim, com `tracking_id` (`promotion_link`) |
| AliExpress | `aliexpress.affiliate.featuredpromo.products.get` | campanhas/promoções da plataforma | parcial | parcial | sim |
| Mercado Livre | `/products/search` + `/products/{id}/items` | fora do escopo desta entrega (ver abaixo) | não | não | **não existe API** |

Três ressalvas que precisam ser confirmadas antes de codar, não depois:

- **AliExpress**: os nomes de método e os campos acima dependem das permissões concedidas ao app no Open Platform. `scripts/verify-aliexpress.ts` deve ser estendido para sondar `product.query`, `hotproduct.query` e `category.get` e imprimir os campos realmente devolvidos. O conector atual (`aliexpress.affiliate.productdetail.get`) **não** devolve volume de vendas — então a métrica de vendas do AliExpress vem da busca, não do detalhe, e isso muda como a atualização de métricas é feita (A.10).
- **Shopee**: `productOfferV2` tem campos além dos que usamos hoje (indicação de loja oficial / Shopee Mall, link do produto, janela da oferta). Vale sondar o schema e, se houver marcador de loja oficial, ele entra direto no classificador de marca (A.6) como sinal forte.
- **Mercado Livre**: sem API de link de afiliado, uma oferta do ML criada automaticamente **não aparece em público** — `lib/catalog.ts` exige `links: { some: { active: true } }`. **Decidido em 11/10/2026: o ML sai do escopo desta entrega** e será atacado depois, por engenharia reversa da geração do link. Até lá, `lib/discovery/ml-match.ts` continua funcionando como hoje (sugestões em `/admin/correspondencias`) e não é generalizado nem ampliado. Nenhuma rota é cadastrada à mão para o ML na Parte B: `/loja/mercado-livre` passa a existir sozinha no dia em que houver oferta do ML com link ativo, pela regra geral de `listStores()`.

### A.2 Contrato: descoberta vira capacidade do conector

Extensão aditiva de `lib/connectors/types.ts` (nenhum conector existente quebra, os campos são opcionais):

```ts
export interface DiscoveryQueryInput {
  kind: "keyword" | "category" | "shop" | "hot" | "promo";
  value?: string;              // palavra-chave, id de categoria ou de loja
  sort: "sales" | "relevance" | "commission" | "discount";
  page: number;
  limit: number;
}

export interface RawCandidate {
  externalListingId: string;
  externalSellerId: string | null;
  sellerName: string | null;
  /** Marcador de loja oficial/mall quando a fonte informa. */
  officialStore: boolean | null;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  previousPriceCents: number | null;
  /** Vendas acumuladas ou dos últimos 30 dias, conforme a fonte. Nunca estimado. */
  salesCount: number | null;
  /** 0–500 (centésimos de estrela), para seguir a convenção de inteiros do projeto. */
  ratingCentis: number | null;
  ratingCount: number | null;
  commissionPct: number | null;
  discountPct: number | null;
  categoryPath: string[];
  observedAt: Date;
}

export interface DiscoveryPage {
  candidates: RawCandidate[];
  page: number;
  hasNextPage: boolean;
}

// em Connector:
capabilities: { fetchPrice; fetchAvailability; affiliateLink; discovery: boolean };
searchCandidates?(input: DiscoveryQueryInput): Promise<DiscoveryPage>;
```

`lib/discovery/shopee.ts` passa a ser a implementação Shopee desse contrato (o código de hoje muda pouco: já normaliza quase tudo isso). `lib/discovery/aliexpress.ts` é novo. `lib/discovery/run.ts` orquestra e não conhece loja nenhuma.

### A.3 Modelo de dados (migrações aditivas)

```prisma
enum DiscoverySource { SHOPEE_API  SHOPEE_FEED  ALIEXPRESS_API }
enum CandidateStatus { NEW  SELECTED  IMPORTED  DUPLICATE  REJECTED  UNAVAILABLE }
enum ProductTier     { BRANDED  GENERIC  UNKNOWN }

/// Pauta da descoberta: o que procurar, onde e com que peso. Editável no admin.
model DiscoveryQuery {
  id        String  @id @default(cuid())
  source    DiscoverySource
  kind      String   // keyword | category | shop | hot | promo
  value     String?
  sort      String   @default("sales")
  pages     Int      @default(2)
  nicheId   String?  // nicho aplicado aos importados desta pauta
  categoryId String?
  /// Cota desta pauta na rodada (0 = sem cota própria, usa a geral).
  quota     Int      @default(0)
  active    Boolean  @default(true)
  position  Int      @default(0)
  lastRunAt DateTime?
  @@index([source, active, position])
  @@map("discovery_queries")
}

/// Uma execução de uma pauta. Mantém o histórico para ajustar filtros com dados reais.
model DiscoveryRun {
  id         String  @id @default(cuid())
  queryId    String?
  source     DiscoverySource
  status     SyncJobStatus @default(QUEUED)   // reaproveita o enum da fila de preços
  input      Json
  found      Int @default(0)
  kept       Int @default(0)
  imported   Int @default(0)
  rejected   Int @default(0)
  /// Contagem por motivo de descarte: {"sem foto": 12, "nota baixa": 40, ...}
  rejections Json?
  startedAt  DateTime?
  finishedAt DateTime?
  error      String?
  @@index([source, startedAt])
  @@map("discovery_runs")
}

/// Candidato visto em alguma fonte. Vive independente da página do admin.
model ProductCandidate {
  id                String @id @default(cuid())
  source            DiscoverySource
  externalListingId String
  externalSellerId  String?
  sellerName        String?
  officialStore     Boolean?
  title             String
  imageUrl          String?
  priceCents        Int
  previousPriceCents Int?
  salesCount        Int?
  ratingCentis      Int?
  ratingCount       Int?
  commissionPct     Int?      // centésimos de ponto percentual
  discountPct       Int?
  categoryPath      String[]
  /// Marca detectada no título (A.6) e classificação resultante.
  brandId           String?
  tier              ProductTier @default(UNKNOWN)
  score             Int
  reasons           String[]
  /// Título normalizado: deduplicação dentro e entre fontes.
  fingerprint       String
  status            CandidateStatus @default(NEW)
  statusReason      String?
  runId             String?
  productId         String?   // preenchido na importação
  firstSeenAt       DateTime @default(now())
  lastSeenAt        DateTime @default(now())
  @@unique([source, externalListingId])
  @@index([status, score])
  @@index([fingerprint])
  @@map("product_candidates")
}

/// Marcas reconhecidas, com apelidos e grafias erradas comuns nos títulos dos marketplaces.
model Brand {
  id      String  @id @default(cuid())
  slug    String  @unique
  name    String
  aliases String[]
  /// Peso no score: 2 = marca forte, 1 = marca conhecida.
  weight  Int     @default(1)
  active  Boolean @default(true)
  @@map("brands")
}
```

Em `Product`, campo novo `tier ProductTier @default(UNKNOWN)` (o `brand String?` já existe e passa a ser preenchido pelo classificador). Em `Offer`, os campos de métrica que a Parte B precisa:

```prisma
// em Offer
salesCount       Int?
ratingCentis     Int?
ratingCount      Int?
metricsCheckedAt DateTime?
```

Métrica é número **da loja**, não nosso: a interface sempre cita a fonte e a data, e nunca mostra métrica com `metricsCheckedAt` mais velho que 30 dias (vira "sem dado recente" em vez de número velho).

### A.4 Portões de qualidade (descarte antes de pontuar)

Descarte registrado com motivo em `DiscoveryRun.rejections` — é assim que se afina o filtro depois.

1. Sem imagem.
2. Título com menos de 15 caracteres (já é regra do feed).
3. Condição diferente de novo; no feed, `cb_option = Cross border`.
4. Preço abaixo de R$ 20,00 (comissão não paga o trabalho) ou acima de um teto por nicho (opcional por pauta).
5. Nota abaixo de 4,5 **quando a fonte informa nota**. Nota ausente não reprova, não pontua (regra que já existe em `score.ts`).
6. Vendas abaixo de 10 **quando a fonte informa vendas**.
7. Comissão ausente ou zero.
8. Lista de termos bloqueados: réplica, similar/inspirado, medicamento, suplemento, emagrecedor, arma, airsoft, fumo, rastreador/espião, "funciona em qualquer", e marcas sabidamente falsificadas em marketplace. Essa lista é dado configurável, não constante de código.
9. Título com mais de 3 marcas distintas detectadas → é anúncio "compatível com", não produto de marca.

### A.5 Pontuação

`scoreCandidate` continua função pura e ganha a dimensão de marca. Pesos propostos (soma 100):

| Dimensão | Peso | Leitura |
|---|---|---|
| Demanda (vendas, log) | 35 | único sinal que não dá para fabricar |
| Confiança (nota × nº de avaliações) | 20 | nota 5,0 com 3 avaliações vale menos que 4,7 com 2 mil |
| Marca (peso da `Brand` + loja oficial) | 15 | é o que o pedido quer puxar para cima |
| Desconto real | 10 | só o que a loja declara como preço anterior |
| Comissão | 10 | — |
| Faixa de preço | 10 | R$ 30–800 é a faixa mais comparável |

Teto que já existe e fica: sem volume mínimo de vendas, o total é limitado (hoje 35). Novo teto equivalente: nota alta com pouquíssimas avaliações não passa de 50.

O número de avaliações é novo no cálculo e muda a ordenação de verdade — é a diferença entre "parece bom" e "muita gente comprou e gostou", que é exatamente o que foi pedido.

### A.6 Marca conhecida vs. genérico

Classificador puro em `lib/discovery/brand.ts`, sem IA:

1. Normaliza o título (`similarity.ts` já tem `normalize` e `significantTokens`).
2. Procura marca por nome e por apelido da tabela `Brand`, casando **palavra inteira** (evita "JBL" dentro de outra palavra) e tolerando a marca no começo do título, onde os marketplaces costumam pôr.
3. Sinais secundários: marcador de loja oficial/mall da fonte, presença de código de modelo (`modelTokens`, que já existe), presença de GTIN no anúncio.
4. Resultado: `BRANDED` (marca da tabela, ou loja oficial + código de modelo), `GENERIC` (nenhuma marca e nenhum código de modelo), `UNKNOWN` (ambíguo — vai para revisão e não entra em cota de marca).

A tabela `Brand` começa semeada (umas 150 marcas: Xiaomi, JBL, Baseus, Mondial, Electrolux, Philco, Cadence, Britânia, Anker, Ugreen, Logitech, Havaianas…), cresce de duas formas, e nenhuma delas é adivinhação: marcas que o Mercado Livre devolve no atributo `BRAND` das correspondências aceitas, e cadastro manual no admin.

**Cotas por rodada** (configuráveis): por padrão, no mínimo 40% dos importados são `BRANDED` e no máximo 50% `GENERIC`, com teto por nicho para uma categoria não dominar a leva (`selectDiverse` em `feed.ts` já faz isso e é reaproveitado).

### A.7 Produto canônico e variações entre lojas

O formato de hoje está certo e fica: **um `Product`, uma `ProductVariant` por variação real, uma `Offer` por anúncio de loja**. Shopee e AliExpress criam o produto; a correspondência acrescenta ofertas ao **mesmo** produto. O que a mudança acrescenta:

- Nasce `lib/discovery/match.ts`, rodando contra qualquer conector com `searchCandidates` — nesta entrega, **Shopee ↔ AliExpress**. `similarity.ts` já é agnóstico o suficiente (compara título, marca, modelo e faixa de preço) e é reaproveitado sem mudança. `ml-match.ts` fica no lugar, como está, até a entrega do Mercado Livre.
- **Vínculo automático só com marca + modelo batendo**, com folga sobre o segundo colocado — a regra de `isAutoMatch` continua valendo, agora para todas as lojas. Sem isso, comparar "o mesmo produto" é mentira e quebra o RF-03.
- **Genérico não tem marca nem modelo**, então nunca cai no caminho automático. **Decidido em 11/10/2026: confirmação humana sempre**, sem exceção e sem limiar que a dispense. A sugestão só entra na fila de `/admin/correspondencias` quando palavras iguais ≥ 75%, razão de preço entre 0,6 e 1,6 e mesma categoria — abaixo disso não é nem sugerido, para a fila não virar lixo e a confirmação continuar barata.
- Quando o candidato do AliExpress e o da Shopee têm o mesmo `fingerprint` **na mesma rodada**, o importador cria **um** produto e anexa as duas ofertas, em vez de criar dois produtos que depois precisam ser casados.

### A.8 A rodada diária

Roda no worker (`scripts/worker.ts`), ao lado do que já existe, numa janela fixa — proposta: 05h00 America/São_Paulo, antes do pico de tráfego e depois da sincronização noturna de preços.

```
DISCOVERY_ENABLED != true  ->  nada acontece, nem um request
```

Etapas, idempotentes e retomáveis (mesmo padrão da fila de preços: se o worker cair no meio, a rodada volta sozinha sem duplicar):

1. **Agendar**: para cada `DiscoveryQuery` ativa, cria uma `DiscoveryRun` `QUEUED`.
2. **Buscar**: `searchCandidates` página por página, respeitando `connector.limits` (concorrência e intervalo mínimo). Falha de rede tenta de novo com espera crescente; credencial recusada falha a rodada na hora e avisa no painel.
3. **Normalizar e gravar**: `upsert` por `(source, externalListingId)`. Candidato já visto atualiza preço, métricas e `lastSeenAt`. Candidato `REJECTED` **não ressuscita** — rejeição é decisão, não estado temporário.
4. **Filtrar** (A.4) e **pontuar** (A.5).
5. **Deduplicar**: por `fingerprint`, contra outros candidatos e contra `Offer.externalListingId` já cadastrado (o que a tela de candidatos já faz hoje, agora no banco).
6. **Selecionar** com as cotas de A.6, até `DISCOVERY_DAILY_LIMIT`.
7. **Importar**: para cada selecionado, buscar **de novo na API** preço, link de afiliado e fotos (`connector.fetchOffer`) e só então `createDraftProduct` + `attachFetchedOffer`. O payload da descoberta nunca é fonte de preço — essa regra já existe em `importCandidates` e em `import-feed.ts` e se mantém. **Sem link de afiliado real, não importa** (`UNAVAILABLE`).
8. **Correspondência entre lojas** (A.7). Falha aqui não desfaz a importação.
9. **Conteúdo**: enfileirar geração editorial (`ProductContent` `PENDING`), senão o produto nunca fica publicável.
10. **Publicar ou revisar** (A.9).

### A.9 Publicação: o que é automático e o que não é

`evaluateProductQuality` (em `lib/adsense/quality.ts`) exige sete dias de histórico observado — um produto descoberto hoje **não pode** ser elegível a SEO hoje, e isso está correto. Então há dois portões distintos:

- **Portão de publicação** (novo, `DISCOVERY_AUTOPUBLISH`, desligado por padrão): nome, foto verificada (`verifiedAt`, `broken = false`), nicho ou categoria, oferta atual com link ativo, conteúdo editorial **publicado** com 120+ caracteres de descrição, e score de descoberta ≥ `DISCOVERY_MIN_SCORE` (proposta: 65). Sem conteúdo publicado não publica — é o que impede o site de encher de página fina.
- **Portão de SEO/AdSense** (existente, intocado): sitemap e anúncios continuam exigindo os sete dias de histórico e o resto de `qualityPolicy`.

Com a chave desligada, tudo para numa fila `/admin/candidatos?status=importado` e o admin publica em lote. **Decidido em 11/10/2026: a chave nasce desligada e fica desligada.** O portão continua sendo construído, porque é ele que define o que é publicável e alimenta a fila de revisão com o motivo de cada pendência; a publicação em si é manual até você decidir o contrário. Com 50 produtos por dia, isso significa uma passagem diária pela fila — então a tela precisa publicar em lote e mostrar o motivo da pendência por produto, não exigir abrir um a um.

### A.10 Atualização de métricas

Vendas e nota envelhecem e a Parte B depende delas. Tarefa separada no worker, a cada 24h, por lotes, preenchendo `Offer.salesCount` / `ratingCentis` / `ratingCount` / `metricsCheckedAt`:

- **Shopee**: `productOfferV2(shopId, itemId)` já é chamado pelo conector de preço; basta passar a ler e gravar `sales` e `ratingStar` no mesmo ciclo — custo zero de request.
- **AliExpress**: `productdetail.get` não devolve volume. Então a métrica vem da busca: as ofertas do AliExpress reaparecem nas rodadas de descoberta e a métrica é atualizada ali, por `externalListingId`. Oferta que nunca mais aparece numa busca fica com métrica velha e a interface para de mostrar o número (regra dos 30 dias). Se a sondagem da A.1 mostrar que há um método em lote com volume, ele substitui esse caminho.
- **Mercado Livre**: não informa vendas. A vitrine do ML não tem seção "mais vendidos" — e é melhor não ter do que inventar uma.

### A.11 Admin

- `/admin/candidatos` reescrita para ler do banco: filtros por fonte, status, nicho, faixa de score, marca/genérico; busca ao vivo continua disponível como "busca manual" (é útil para pauta nova). Ações: importar, rejeitar com motivo, marcar marca errada.
- `/admin/descoberta` (nova): pautas (`DiscoveryQuery`) com CRUD, histórico de rodadas com achados/importados/descartes por motivo, botão "rodar agora" de uma pauta, e estado das credenciais por conector (`isConfigured`).
- `/admin/marcas` (nova): tabela `Brand`, apelidos, peso, ativar/desativar.
- `/admin/correspondencias` (existente): ganha as sugestões do AliExpress e a fila **obrigatória** de confirmação de genéricos (A.7). As sugestões do Mercado Livre continuam aparecendo aqui como hoje.

### A.12 Configuração

```
DISCOVERY_ENABLED=false         # nada roda sem isto
DISCOVERY_HOUR=5                # hora America/Sao_Paulo da rodada
DISCOVERY_DAILY_LIMIT=50        # importados por dia, somando as fontes
DISCOVERY_MIN_SCORE=55          # score mínimo para importar
DISCOVERY_AUTOPUBLISH=false     # portão da A.9 — decidido: permanece false
DISCOVERY_BRANDED_MIN_PCT=40
DISCOVERY_GENERIC_MAX_PCT=50
```

### A.13 Testes

Tudo o que decide é função pura e testável sem rede, no padrão do repositório (`npm test` → `tsx --test "lib/**/*.test.ts"`):

`lib/discovery/score.test.ts` (pesos, tetos, nota sem avaliações), `brand.test.ts` (marca no começo, apelido, palavra inteira, título "compatível com"), `gates.test.ts` (cada motivo de descarte), `dedup.test.ts` (fingerprint entre fontes), `selection.test.ts` (cotas de marca e teto por nicho), `match.test.ts` (nenhum genérico vira vínculo automático).

---

## Parte B — Vitrines por loja (RF-17)

### B.1 Rotas

| Rota | Conteúdo |
|---|---|
| `/loja` | índice das lojas com contagem real de produtos |
| `/loja/[slug]` | vitrine da loja: achados do dia, mais vendidos, melhores ofertas, novidades, marca/genérico |
| `/achadinhos` | genéricos bem avaliados, de todas as lojas |
| `/marcas` | produtos de marca conhecida, de todas as lojas |

`Store` já tem `slug`; ganha `tagline String?` e `about String? @db.Text` para a página ter texto próprio e não ser uma lista pelada (importa para SEO e para a página não concorrer com `/ofertas`). `/busca` e `/ofertas` ganham filtro `tier` (marca / genérico), que é o mesmo dado das duas páginas temáticas.

O índice e as vitrines saem de `listStores()`, que já só devolve loja com oferta pública (ativa, com preço e com link de afiliado ativo). Então não há lista de lojas no código: a Shopee e o AliExpress aparecem porque a rodada diária os alimenta, e o Mercado Livre aparece sozinho no dia em que a engenharia reversa do link entregar ofertas com link ativo — sem mudar uma linha da Parte B.

Navegação: "Lojas" entra no `SiteHeader`, e as rotas novas entram no sitemap — `/loja/[slug]` só é indexada com pelo menos 12 produtos elegíveis; abaixo disso, `noindex`.

### B.2 Seções e de onde vem cada número

| Seção | Fonte do dado | Rótulo honesto |
|---|---|---|
| **Achados do dia** | `ShowcaseEntry` do dia, montada pelo worker | "selecionados hoje às 05h40" + motivo por card |
| **Mais vendidos** | `Offer.salesCount` da loja | "2,3 mil vendidos segundo a Shopee, em 09/10" |
| **Melhores ofertas** | `dealsWithHistory()` filtrado pela loja | reaproveita os rótulos de `/ofertas` (abaixo da média de 30 dias, menor preço em 30 dias) |
| **Novidades** | ofertas da loja criadas nos últimos 7 dias | "entrou no catálogo em 08/10" |
| **Marca / Genéricos** | `Product.tier` | duas abas na mesma vitrine |
| **Também em outras lojas** | contagem de `Offer` do mesmo produto | "também em 2 lojas" com link para a comparação |

A última linha é o diferencial: a vitrine da loja serve quem já decidiu onde comprar, mas o site ganha quando mostra que existe comparação. Todo card que tem oferta em mais de uma loja diz isso.

### B.3 Seleção diária congelada

```prisma
enum ShowcaseKind { ACHADOS  MAIS_VENDIDOS  MELHORES_OFERTAS  NOVIDADES }

/// Seleção do dia por loja. Congelada para a página poder dizer "hoje" com verdade,
/// e para a mesma pessoa não ver uma vitrine diferente a cada F5.
model ShowcaseEntry {
  id              String @id @default(cuid())
  storeId         String
  kind            ShowcaseKind
  /// Dia em America/Sao_Paulo.
  day             DateTime @db.Date
  position        Int
  productId       String
  offerId         String
  variantId       String
  /// Snapshot do que justificou a entrada.
  priceCents      Int
  priceObservedAt DateTime
  reason          String
  createdAt       DateTime @default(now())
  @@unique([storeId, kind, day, productId])
  @@index([storeId, kind, day, position])
  @@map("showcase_entries")
}
```

`buildShowcases()` roda uma vez por dia no worker, depois da sincronização de preços e da rodada de descoberta. Idempotente por `(storeId, kind, day)`: rodar duas vezes no mesmo dia não duplica nem embaralha.

Na renderização, a página **reconfere**: entrada cuja oferta deixou de ser elegível (sem preço, sem link ativo, produto despublicado, preço subiu acima do que justificou a entrada) **sai da lista** em vez de mostrar dado velho. Vitrine com menos de 4 entradas válidas esconde a seção inteira — melhor uma seção a menos que uma seção mentirosa.

Critérios de entrada em **Achados do dia** (até 12 por loja, nessa ordem de prioridade): preço no menor valor de 30 dias; ≥ 15% abaixo da média de 30 dias; queda ≥ 20% em 7 dias; nota ≥ 4,6 com ≥ 500 vendas e desconto declarado ≥ 25%. Cada entrada guarda em `reason` o critério que a colocou ali, e é esse texto que o card mostra.

### B.4 Como incentivar a compra sem mentir

O que entra no card, tudo lastreado em dado que já existe no banco:

- Preço, preço anterior riscado só quando a loja declara, e `DropBadge` (componente existente).
- "**Menor preço em 30 dias**" só quando `atMinimum` é verdade; "**X% abaixo da média de 30 dias**" só com os sete dias de observação que `analyzeDeal` já exige.
- Faísca do histórico (`lib/chart.ts`) — ver o preço descendo convence mais que qualquer selo.
- Frete grátis só de `shippingKind = FREE`; parcelamento só quando a loja informa.
- Vendas e nota com fonte e data (B.2).
- "Também em N lojas" com o preço da mais barata.
- **Alerta de preço** e **favoritar** (já existem): a pessoa que não compra hoje volta amanhã. É o CTA secundário mais valioso do site e hoje não aparece em lista nenhuma.
- CTA único: `/go/{shortCode}`. Nunca a URL original da loja — regra que já vale em todo o site.

E o que **não** entra, por decisão explícita: contador de tempo que não corresponde a promoção real da loja, "só restam 3 unidades" (não temos estoque confiável de nenhuma das três fontes), "N pessoas vendo agora", desconto calculado sobre preço anterior que a loja não declarou. Fora de ser exposição sob o CDC e o CONAR, é o tipo de coisa que mata a recompra — e o alerta de preço só funciona se a pessoa confiar no número.

A divulgação da relação de afiliado (`/afiliados`) fica no rodapé de cada vitrine.

### B.5 Entregas

| # | Entrega | Depende de |
|---|---|---|
| 1 | Contrato `searchCandidates` + modelos Prisma de A.3 + `lib/discovery/run.ts` com rodada manual por script | — |
| 2 | Shopee portada para o contrato novo; candidatos persistidos; `/admin/candidatos` lendo do banco | 1 |
| 3 | AliExpress: sondagem da API (`verify-aliexpress.ts`), conector de descoberta | 1 |
| 4 | `Brand` + classificador + cotas + `/admin/marcas` | 2 |
| 5 | `match.ts` Shopee ↔ AliExpress + fila de confirmação de genéricos em Correspondências | 2, 3 |
| 6 | Rodada diária no worker + `/admin/descoberta` + portão de publicação | 2–5 |
| 7 | Métricas em `Offer` + `ShowcaseEntry` + `buildShowcases` | 2, 3 |
| 8 | `/loja`, `/loja/[slug]`, `/achadinhos`, `/marcas`, filtro `tier`, nav, sitemap | 7 |

As entregas 1–3 são as que destravam tudo; 7 e 8 só fazem sentido com catálogo já alimentado pela rodada diária.

### B.6 Critérios de aceite

- Uma rodada diária com `DISCOVERY_ENABLED=false` não faz nenhum request externo.
- Uma rodada registra achados, descartes por motivo e importados, e rodar duas vezes no mesmo dia não cria produto duplicado.
- Nenhum produto importado tem oferta sem link de afiliado ativo.
- Nenhum par de genéricos de lojas diferentes vira o mesmo produto sem confirmação humana.
- Com `DISCOVERY_AUTOPUBLISH=false`, nenhum produto sai de `DRAFT` sozinho.
- A vitrine de uma loja sem dado suficiente esconde a seção, não a preenche com outro recorte.
- Todo número de vendas e nota exibido em público tem loja e data ao lado, e desaparece se tiver mais de 30 dias.
- `npm test` e `npx tsc --noEmit` passam.

---

## Decisões tomadas (11/10/2026)

1. **Genéricos entre lojas — confirmação humana sempre.** Nenhum vínculo automático entre genéricos de lojas diferentes, em nenhum limiar. Reflete-se em A.7 e no critério de aceite correspondente.
2. **Publicação automática — desligada.** O portão é construído e usado para classificar a fila de revisão, mas `DISCOVERY_AUTOPUBLISH` nasce e permanece `false`. Reflete-se em A.9 e A.12.
3. **Mercado Livre — fora do escopo**, a ser resolvido depois por engenharia reversa do link de afiliado. `ml-match.ts` fica como está; `match.ts` cobre só Shopee ↔ AliExpress; nenhuma tela nova de link manual; `/loja/mercado-livre` aparece sozinha quando houver oferta com link ativo. Reflete-se em A.1, A.7, A.11, B.1 e na entrega 5.
4. **Volume — 50 produtos importados por dia.** Reflete-se em A.12 (`DISCOVERY_DAILY_LIMIT=50`).

### O que ainda falta definir

**Divisão entre Shopee e AliExpress** dentro dos 50/dia. Isso não é variável de ambiente: sai das cotas das pautas (`DiscoveryQuery.quota`), então é dado, não código, e muda sem deploy. O padrão semeado é 25 Shopee + 25 AliExpress. Há um argumento para pesar na Shopee — frete nacional, prazo curto e sem imposto de importação convertem melhor, e a API dela já está em produção aqui —, e um argumento para pesar no AliExpress — marca conhecida barata é mais fácil de achar lá, e é justamente o que as cotas de marca precisam. Como as pautas são editáveis no admin, a decisão pode esperar os primeiros números de clique por loja.
