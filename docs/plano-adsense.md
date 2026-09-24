# Plano de implementação — adsense.md

Data: 23/09/2026.
Fonte de escopo: `Requisitos/adsense.md`.

Este é o plano correspondente ao pedido corrigido. Substitui, para esta demanda, o escopo do `plano-requisitos-consolidado.md`. Trata da evolução do Affiliate Hub para entregar os requisitos de utilidade, histórico, SEO e publicidade do documento de AdSense. Migração do Meu Novo Lar, expansão de conectores, criativos e distribuição social não fazem parte desta entrega.

## Estado da implementação — primeiro lote

- Política de qualidade central criada em `lib/adsense/quality.ts`, com pontuação, motivos, elegibilidade de SEO e elegibilidade separada de anúncios.
- Página de produto e sitemap compartilham a regra. O histórico mínimo agora exige sete dias distintos observados na oferta exibida por padrão, ao longo de pelo menos uma semana, dentro dos últimos 90 dias.
- Configuração central e pontos de anúncio após comparação e histórico adicionados. A publicidade está desativada e o componente não carrega provedor nem reserva espaço; consentimento e integração real pertencem à Fase 6.
- O histórico da oferta registra cada coleta bem-sucedida, mesmo sem mudança de preço, com deduplicação por job; a migração aditiva acrescenta contexto comercial opcional às observações. O gráfico deixa lacunas sem coleta visíveis; média e análise usam somente dias observados, e “O preço está bom?” só classifica preços com cobertura suficiente.
- Prisma Client regenerado. Migrações verificadas no PostgreSQL local; `migrate deploy` não encontrou pendências. A consulta SQL de cobertura foi executada no banco. Onze testes de qualidade/histórico, `prisma validate`, typecheck e build passaram. O build emite avisos prévios de rastreamento de arquivos dinâmicos em `lib/creatives/storage.ts`.
- Próximo lote: completar captura de condições de preço/frete nos conectores, conferir custos do sitemap com catálogo real e expandir análises comparáveis entre ofertas da mesma variação. As observações anteriores à mudança, registradas apenas quando havia alteração, não foram retroativamente preenchidas.

## Segundo lote — condições das observações (24/09/2026)

- Contrato dos conectores ampliado com condições de pagamento, total parcelado e frete. Importação inicial e sincronização gravam os campos na oferta e no histórico, usando a mesma normalização.
- Campos omitidos pela coleta ficam desconhecidos; condições antigas de Pix, parcelas ou frete não são carregadas junto com um novo preço sem confirmação. No histórico, estoque não informado fica `UNKNOWN`, sem reutilizar o estoque cadastrado como observação nova.
- Shopee: a consulta atual não informa essas condições. Mercado Livre: quando a resposta traz `shipping.free_shipping`, o indicador positivo é tratado como frete condicional, sem atribuir custo zero na ausência de destino. Nenhuma consulta adicional de frete ou credencial foi adicionada.
- Validação local: typecheck e 15 testes de qualidade, análise histórica e normalização aprovados. Sem alteração de schema, migração ou publicação. Não houve consulta autenticada às lojas para homologar os campos nesta etapa.
- A Fase 2 ainda não está encerrada: faltam série consolidada por variação/contexto, filtro de compatibilidade nas análises e compartilhamento dos agregados entre rankings. A avaliação de custo do sitemap com catálogo real também continua pendente.
- Preferência de interface registrada: diagnósticos de coleta e avisos “Desatualizado há…” e “ofertas fora da comparação” não são mostrados ao visitante. A elegibilidade interna dos preços continua valendo.

## Terceiro lote — histórico comparável por variação (24/09/2026)

- Página de produto passa a usar o menor preço observado por dia entre ofertas públicas da variação selecionada, da mesma condição do item e da mesma condição de pagamento. Ofertas sem estoque não entram nessa série. A média continua dando peso igual a cada dia observado.
- Cada nova observação guarda a variação e a condição do item no instante da coleta. A migração aditiva `20260924130000_price_point_identity` foi aplicada ao PostgreSQL local; os pontos legados sem esses atributos ficam fora da série consolidada, sem atribuição retroativa incerta.
- A regra de qualidade passa a exigir histórico compatível também com a condição de pagamento e a disponibilidade observada. O histórico exibido permanece limitado às ofertas públicas atualmente monitoradas, e não representa todas as lojas da internet.
- Quatro testes novos da agregação passaram, junto aos 15 testes já existentes, Prisma validate, typecheck e build. Consulta real: 28 ms para uma oferta; o catálogo local ainda tem 0 produtos elegíveis no sitemap, portanto os 93 ms medidos não validam escala de produção.
- Próximos trabalhos: alinhar os recortes de `/ofertas` à mesma série, distinguir novo/usado no comparador atual e medir a consulta do sitemap com catálogo representativo.

## 1. O que já existe e deve ser aproveitado

Diagnóstico por leitura de código; funcionamento integrado não foi revalidado nesta atividade.

| Área | Base existente | Lacuna relevante ao adsense.md |
|---|---|---|
| Catálogo/comparador | Produto, variações, ofertas, links e páginas públicas | Auditar equivalência, condições, frete e informação de atualização |
| Histórico | `PricePoint`, `components/price-history.tsx`, períodos de 30/90 dias, 6 meses e 1 ano | Preservar contexto de preço/frete; validar cobertura, lacunas e significado da série |
| Série exibida | Página carrega histórico da oferta atualmente mais barata | Não representa automaticamente o histórico consolidado do produto |
| Alertas | Conta, favoritos e alertas por e-mail | Vinculação à variação/contexto, entrega validada e push web |
| Conteúdo | Gemini, revisão e especificações | Qualidade verificável, atributos por categoria e guias próprios |
| SEO | Sitemap, robots, canonical e busca com noindex | Elegibilidade central, sitemap seletivo e cobertura de dados estruturados |
| Busca/ofertas | Rotas `/busca`, `/categoria/[slug]` e `/ofertas` | Busca limitada a 300 candidatos; rankings precisam de metodologia histórica consistente |
| Métricas | Eventos e painel existentes | Eventos de gráfico, comparação, alertas e exposição de ofertas |
| Publicidade | Requisitos documentados | Configuração, política, slots, consentimento e ads.txt |

Não reconstruir funcionalidades prontas. Validá-las e completar as lacunas. Os períodos do gráfico já existem; o trabalho principal ali é a confiabilidade dos dados e cálculos.

## 2. Ordem de implementação

### Fase 1 — Fundamentos de qualidade e publicidade desabilitada

**Referência:** §§21–28, 40, 44–46.

- Criar avaliação central de qualidade com pontuação, motivos de bloqueio, `seoEligible` e `adsEligible` separados.
- Tratar os pesos e cortes 70/80 do documento como proposta interna configurável, nunca como exigência ou garantia de aprovação do Google.
- Definir requisitos obrigatórios além da nota: identidade correta, conteúdo original/revisado, imagem válida, categoria, especificações e cobertura histórica suficiente.
- Modelar preparação editorial — rascunho, importado, enriquecendo, pronto e publicado — sem duplicar desnecessariamente o status público existente.
- Criar `adsConfig`, `shouldShowAds(route, pageData)` e `AdSlot` desde o começo. Padrão: desligado, sem scripts e sem espaço vazio.
- Definir interface de consentimento para scripts opcionais e integração futura de CMP; a seleção/configuração concreta depende do público e dos serviços utilizados.
- Exibir no admin a pontuação, os bloqueios e o que falta para publicar, indexar e monetizar.

**Aceite:** publicar não habilita automaticamente indexação ou anúncios; páginas bloqueadas não carregam publicidade; avaliação possui casos de teste e razões compreensíveis.

### Fase 2 — Histórico confiável e análise de preço

**Referência:** §§4, 6–9, 34–36, 43.

- Evoluir observações existentes com preço à vista/condição, frete conhecido e contexto, disponibilidade, fonte e data. Preservar ligação com oferta, loja e rastreamento sem duplicar histórico por link de campanha.
- Registrar verificações bem-sucedidas mesmo sem alteração, ou manter informação equivalente que permita distinguir cobertura real de preço simplesmente carregado adiante.
- Separar série de uma oferta de série consolidada por variação/contexto. Não misturar Pix, clube, primeira compra, kit/unidade ou voltagens diferentes.
- Definir metodologia versionada: proposta inicial para a série consolidada é menor preço elegível observado por dia, com média dos dias cobertos. Manter a série individual identificada quando exibida.
- Mostrar cobertura e lacunas. O componente atual prolonga o último ponto até o presente; revisar isso para não sugerir verificação contínua quando o preço perdeu validade.
- Reaproveitar os quatro períodos existentes e completar menor, maior, média, variação percentual, última mudança e lista de alterações recentes.
- Criar “O preço está bom?” e classificação de preço com cálculo determinístico, período explícito e limiares configuráveis. Dados insuficientes geram estado informativo, sem selo.
- Compartilhar os mesmos agregados entre produto, home, categorias e rankings; atualizar/invalidate-los quando as observações mudarem.

**Aceite:** trocar a loja mais barata não distorce o histórico; frete desconhecido não vira zero; média não favorece lojas consultadas mais vezes; uma amostra não sustenta alegação de promoção histórica.

### Fase 3 — Produto, especificações e alertas

**Referência:** §§3–5, 10–12, 29–30, 33.

- Completar cabeçalho com características, preço elegível, lojas, atualização e alerta. Manter comparador antes dos textos extensos.
- Exibir vendedor, marketplace, pagamento, parcelas, disponibilidade, cupom e frete. Total com frete somente em contexto compatível; cashback somente verificável e identificado.
- Inserir aviso de afiliação próximo ao comparador e CTAs claros como “Ver oferta na Amazon”. Somente links afiliados reais; sem fallback para URL crua da loja.
- Estruturar atributos tipados por categoria, com unidades, fontes e validação. Não criar identidades diferentes apenas por título; associação de produtos equivalentes precisa considerar seus atributos.
- Completar conteúdo original: resumo, características, pontos fortes, cuidados e público indicado. IA auxilia com fontes, sem inventar testes, avaliações ou dados de preço.
- Vincular alerta à variação/contexto escolhido. Alertas legados ambíguos exigem seleção explícita, sem atribuição silenciosa.
- Homologar e-mail e implementar push web com permissão solicitada por ação do usuário, inscrição, revogação, cancelamento e tentativas persistidas. Nunca inserir AdSense em alertas externos.
- Produto indisponível pode continuar útil com histórico e especificações; fica sem anúncios. Retirada definitiva deve ter destinação individual, sem redirecionamento genérico.

**Aceite:** alerta da variação A não dispara com preço da B; comparador, histórico e análise usam o mesmo contexto; conteúdo continua útil sem CTAs comerciais.

### Fase 4 — Páginas de descoberta e conteúdo próprio

**Referência:** §§13–20, 42.

- Corrigir filtros, ordenação e paginação da busca para não depender dos primeiros 300 candidatos; exibir indicadores somente com dados suficientes.
- Manter `/busca` como rota existente: `/buscar` no requisito é exemplo, não necessidade de criar duplicata.
- Enriquecer categorias com introdução original, marcas, estatísticas, quedas, acompanhamentos e ofertas recentes. Não indexar categorias vazias.
- Revisar `/ofertas` para usar quedas comprovadas pelo histórico próprio, em vez de considerar qualquer link ou preço de referência como promoção.
- Criar `/menor-preco` com período, cobertura e tolerância explícitos; criar `/tendencias` com dados próprios e janela temporal definida.
- Implementar comparação dinâmica entre produtos da mesma categoria e páginas revisadas `/comparar/[slug]`, com atributos/unidades compatíveis. Combinações arbitrárias ficam fora da indexação automática.
- Criar `/guias` e páginas de guia com autoria/revisão, datas e fontes. Começar pelos temas metodológicos sugeridos no documento, sem quantidade artificial de artigos.
- Criar `/sobre`, `/como-funciona`, `/contato`, `/politica-de-privacidade`, `/politica-de-cookies`, `/termos-de-uso` e `/afiliados`, descrevendo a operação real.
- Atualizar home com oportunidades reais, menores preços históricos, mais acompanhados, categorias, funcionamento e guias. Omitir blocos sem dados suficientes.

**Aceite:** rankings têm metodologia reproduzível; busca não perde resultados pelo limite de candidatos; páginas entregam informação própria e estados vazios honestos.

### Fase 5 — SEO seletivo e coerente

**Referência:** §§14–15, 27, 29–32, 38, 44–46.

- Fazer metadata e sitemap consumirem a mesma política central de qualidade.
- Criar índice de sitemaps e saídas de produtos, categorias e guias; somente páginas publicadas e elegíveis entram.
- Completar canonical, OpenGraph, Twitter Cards, breadcrumbs e marcação Product/Offer/AggregateOffer/Article/Organization/WebSite quando aplicável e fiel ao conteúdo visível.
- Manter busca arbitrária e facetas com `noindex,follow`; não bloquear o rastreamento necessário para ler o noindex. Definir canonical conforme equivalência real.
- Consolidar duplicatas com identidade comprovada e URLs equivalentes. Produto temporariamente indisponível não recebe 410 automaticamente.
- Resolver explicitamente a exceção do documento: produto antigo com histórico e conteúdo útil pode permanecer indexável sem oferta atual; publicidade exige oferta atual. Produto novo e incompleto permanece noindex.
- Não condicionar indexação apenas à nota ou quantidade de palavras. Definir `MIN_HISTORY` por cobertura e documentar a decisão.

**Aceite:** nenhuma página incompleta entra no sitemap; filtros não multiplicam páginas indexáveis; dados estruturados não declaram avaliações, estoque ou preços ausentes da tela.

### Fase 6 — Consentimento, anúncios e desempenho

**Referência:** §§21–26, 28, 37, 39–40.

- Integrar a solução de consentimento escolhida, com carregamento controlado de Analytics/AdSense e revogação. Conferir requisitos oficiais vigentes por região/conta durante a implementação.
- Posicionar slots após comparador e histórico, com separação visual dos CTAs; anúncios não podem parecer ofertas ou lojas.
- Aplicar bloqueio central em autenticação (inclusive `/entrar`), conta, configurações, alertas, admin, erros, páginas vazias/incompletas e produtos sem preço atual.
- Quando desabilitado, slot não renderiza. Quando habilitado, reservar dimensão responsiva antes do carregamento para reduzir CLS, sem placeholders publicitários na versão desativada.
- Preparar `/ads.txt` para o identificador real da conta; não publicar identificadores fictícios.
- Verificar dimensões de imagens, lazy loading, fontes, cache, JavaScript e comportamento mobile com/sem anúncios. Medir LCP, INP e CLS, registrando ambiente e resultados.
- Manter ativação separada da implantação: configuração real e aprovação são condições para habilitar publicidade.

**Aceite:** anúncios só carregam em páginas e condições permitidas; consentimento funciona; não há deslocamento evitável de layout nem proximidade enganosa com botões.

### Fase 7 — Métricas e checklist de solicitação

**Referência:** §§41, 47–50.

- Ampliar o módulo existente com `affiliate_offer_view`, `affiliate_click`, `price_alert_created`, `product_view`, `price_chart_view` e `comparison_created`.
- Documentar eventos, deduplicação, retenção e uso nas tendências. Não medir clique como venda nem criar mecanismos de incentivo a clique em anúncio.
- Homologar fluxo completo no celular: busca → produto/variação → comparação → histórico → alerta → loja.
- Verificar página útil sem anúncios e links comerciais, conteúdo original, preços datados, transparência, navegação e páginas institucionais reais.
- Executar integralmente o checklist do §49 e registrar evidências. Solicitação e aprovação do AdSense são etapas externas; a implementação não garante aprovação.

**Aceite:** checklist sem pendências técnicas/editoriais conhecidas, operação real comprovada e publicidade ainda desligada até liberação apropriada.

## 3. Dependências e primeiros lotes

| Lote | Entrega | Dependência |
|---|---|---|
| 1 | Baseline de validação + qualidade central + publicidade desabilitada | Código atual |
| 2 | Observações, contexto e metodologia do histórico | Auditoria dos dados existentes |
| 3 | Produto, análise e alertas completos | Lotes 1–2 |
| 4 | Descoberta, comparação e guias | Agregados confiáveis; conteúdo institucional pode começar antes |
| 5 | SEO seletivo e integração final de consentimento/slots | Política de qualidade e páginas prontas |
| 6 | Métricas, desempenho e checklist | Fluxos implementados e serviços configurados |

Prioridade inicial: lotes 1 e 2. Acumular histórico real desde cedo; não há como substituir tempo de observação por geração de texto ou dados artificiais. Não é necessário esperar aprovação do AdSense para entregar a utilidade do site.

## 4. Decisões necessárias, sem bloquear o planejamento

- Mínimo de cobertura histórica e faixas de classificação de preço: configurar e versionar; exemplos do documento não definem valores obrigatórios.
- Pesos/cortes de qualidade: usar a proposta do documento inicialmente, subordinada aos bloqueios obrigatórios.
- Domínio, identidade do operador e contato: necessários para concluir institucionais, canonical e sitemap de produção.
- SMTP, push e público geográfico: necessários para homologar notificações e definir integração de consentimento.
- Identificadores reais AdSense/slots: necessários apenas à configuração final; até lá manter anúncios desligados.

## 5. Validação por entrega

- Reaproveitar testes existentes e adicionar testes de cálculos, cobertura histórica, elegibilidade, alertas por variação e política de anúncios.
- Testar consultas, migrações e agregados com PostgreSQL; não confundir validação estática com funcionamento real.
- Rodar `npx prisma generate` após alterações de schema e sempre `npx tsc --noEmit -p tsconfig.json` após mudanças de código.
- Antes de alterar código Next.js, ler os guias locais da versão instalada. Executar build com serviços necessários disponíveis.
- Verificar SEO renderizado, sitemap, structured data, consentimento e layout em desktop/mobile.
- Testes de notificações usam destinatários de teste; homologação de publicidade não envolve cliques em anúncios.

Este documento registra o plano e o estado de execução. A publicidade permanece desativada; a solicitação ao AdSense e a integração de consentimento continuam pendentes.
