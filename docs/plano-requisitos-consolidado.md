# Plano consolidado de implementação — Affiliate Hub

Data: 23/09/2026. Fontes: `Requisitos/Affiliate-Hub-Requisitos.md` e `Requisitos/adsense.md`.

Este plano organiza o trabalho restante a partir do código atual. Complementa `docs/plano-de-implementacao.md`, preservando seu histórico. Não representa execução, homologação ou aprovação pelo AdSense.

## 1. Direção e escopo

Entregar um comparador multínicho com produto canônico, variações equivalentes, ofertas rastreáveis, histórico real, análise quantitativa, conteúdo revisado e alertas. Preparar publicidade desde a arquitetura, mantendo-a desabilitada até a configuração e aprovação necessárias.

O documento de AdSense amplia o escopo anterior: histórico visual, análise de preços e alertas passam a fazer parte desta entrega; comparação entre produtos, tendências, guias e push web também entram no backlog obrigatório consolidado. Não confundir os exemplos e limiares sugeridos nos documentos com regras externas do Google.

Regras permanentes:

- Toda saída comercial usa `/go/[code]` ou link de afiliado validado. Sem afiliação, desabilitar CTA e impedir exportação/publicação; nunca recorrer à URL original da loja.
- Comparar a mesma variação, condição do item e contexto de pagamento. Frete desconhecido não equivale a frete grátis.
- Preços em centavos inteiros; métricas, descontos e análises sempre derivados de dados verificáveis.
- Affiliate Hub é multínicho. Meu Novo Lar permanece exclusivamente editorial sobre casa; Mago da Meia Noite fica fora desta reorganização.
- Migrações aditivas, preservação de histórico, imagens, códigos públicos e relações; nenhuma exclusão automática de dados legados.
- Publicação, indexação e publicidade são três decisões distintas. Uma pontuação alta não substitui identidade correta, conteúdo útil e revisão.

## 2. Diagnóstico utilizado

Inspeção estática, sem executar banco, integrações ou serviços nesta atividade de planejamento.

| Área | Evidência atual | Trabalho restante |
|---|---|---|
| Fundação | Next.js 16, Auth.js, Prisma 7; schema e migrações presentes | Homologar migrações, autorização, build e execução com PostgreSQL |
| Catálogo | Produto, variação, oferta, links, taxonomia e admin existentes | Importação completa, campanhas, equivalência, fusão/desmembramento e classificação externa |
| Comparação | `lib/pricing.ts` e `lib/catalog.ts` | Auditar condições restritas, disponibilidade desconhecida, contagem de lojas e unicidade de anúncios |
| Busca | `SEARCH_CANDIDATES = 300`, filtros posteriores em memória | Filtrar, ordenar e paginar no banco sem truncar resultados válidos |
| Histórico | `PricePoint`, gráfico e estatísticas presentes | Série consistente por variação/contexto; períodos, cobertura e análise confiável |
| Página do produto | Busca histórico da oferta atualmente escolhida como melhor | Evitar apresentar essa série como histórico consolidado de todas as lojas |
| Alertas | E-mail e favoritos; `PriceAlert` único por usuário/produto | Vincular contexto/variação, homologar entrega e implementar push |
| Coleta | Conectores Shopee/ML, fila PostgreSQL e worker presentes | Comprovar capacidades por conta; completar coletor piloto e testes de recuperação |
| Conteúdo e criativos | Gemini, revisão, verificação de imagens e Sharp presentes | Homologar fontes, proteção de edição, invalidação e exportações |
| Comunidades/distribuição/métricas | Código e migrações recentes; Telegram inicial | Homologação integrada; ampliar eventos e capacidades por destino |
| SEO | Sitemap, robots, canonical e `noindex` da busca presentes | Política única de qualidade, sitemap seletivo, filtros e dados estruturados completos |
| AdSense | Documento de requisitos | Elegibilidade, configuração, slots, consentimento, ads.txt e ativação controlada |
| Novas páginas | `/ofertas` existe; várias rotas novas não aparecem no inventário | Institucionais, guias, comparação, menor preço e tendências |

O plano anterior registra migrações e validação integrada pendentes por indisponibilidade do banco naquela execução. Revalidar o estado atual; não tratar esse registro como diagnóstico de disponibilidade de hoje. Há alterações locais em andamento: preservá-las e revisar antes de qualquer integração.

## 3. Sequência de execução

### Etapa 0 — Estabelecer uma base verificável

1. Inventariar alterações locais e confrontar cada entrega com os 20 critérios de aceite do documento principal.
2. Confirmar banco dedicado, ambiente local/homologação e migrações aplicadas. Ensaiar backup e restauração antes da migração de dados.
3. Executar testes existentes, typecheck e build com banco disponível; registrar falhas reais separadamente das pendências funcionais.
4. Ler os guias locais da versão instalada do Next.js antes de alterar código. Ajustar scripts de verificação ao que essa versão suporta — o script atual `next lint` precisa ser conferido.
5. Criar uma matriz de status: existente no código, testado localmente, homologado com serviço real, implantado.

**Aceite:** ambiente reproduzível, migrações conhecidas e baseline de verificações registrada. Não promover funcionalidades a concluídas apenas porque há arquivos ou tabelas.

### Etapa 1 — Corrigir identidade, oferta e contexto comercial

1. Revisar a chave atual de oferta (`storeId + externalListingId + variantId`) para representar vendedor, variação externa e contexto comercial sem colisões. Migrar após analisar dados existentes.
2. Formalizar atributos de identidade por categoria: unidades, volume, capacidade, voltagem, tamanho e condição. Título semelhante apenas sugere correspondência.
3. Separar preço geral de Pix, clube, app, primeira compra e cupom; preservar total parcelado e condições. Permitir cashback apenas com evidência, sem dedução silenciosa.
4. Centralizar elegibilidade e resumo por variação/contexto. Decidir tratamento explícito de estoque desconhecido; não descrevê-lo como estoque confirmado.
5. Completar o admin de links de campanha sem duplicar oferta, coleta ou histórico.
6. Implementar associação revisada, fusão e desmembramento com auditoria de IDs e redirecionamentos.
7. Definir atributos tipados por categoria, unidades e validação, aproveitando os campos existentes em vez de criar outro catálogo.

**Aceite:** quatro ofertas, duas da mesma loja, aparecem corretamente; 30/60 ml, kit/unidade e novo/usado nunca concorrem como equivalentes; duas campanhas não duplicam lojas ou observações. Nenhum canal exporta URL não afiliada.

### Etapa 2 — Completar importação e coleta confiável

1. Evoluir importação por URL/conector com prévia: vincular a cadastro existente ou criar produto e variação em rascunho.
2. Persistir mapeamento de categorias externas por provedor/identificador; desconhecidas vão para revisão. Sugestões de IA não publicam automaticamente.
3. Homologar capacidades independentes de cada conector: anúncio, preço, estoque, categorias, imagens e afiliação.
4. Selecionar a segunda loja após estudo executável; aproveitar o código ML existente quando compatível. Implementar coletor web piloto com fixtures, versão do extrator e validação de anúncio/variação.
5. Testar ciclo de 24 horas, prioridade, limites, timeout, retentativa, lease e retomada após reinício. Manter fila PostgreSQL inicialmente.
6. Diferenciar erro de coleta, estoque indisponível, sessão expirada e preço suspeito; preservar último dado e sua idade. Proteger cookies e credenciais no servidor.

**Aceite:** reiniciar worker não duplica trabalho concluído; HTML alterado ou sessão expirada não publica preço incorreto; painel mostra pendências e reprocessamento. Coleta assistida não substitui o serviço diário de produção.

### Etapa 3 — Construir histórico e inteligência de preços

1. Evoluir `PricePoint` para preservar o contexto observado: preço, modalidade/condição, frete e contexto geográfico quando conhecido, disponibilidade, fonte, método, instante e vínculo com oferta. Manter rastreabilidade de links sem duplicar coleta por campanha.
2. Separar observações bem-sucedidas de alterações de preço. Não fabricar medições retroativas nem preencher períodos sem dados como observados.
3. Manter série por oferta e criar série diária comparável por variação/contexto. Proposta inicial: menor preço elegível observado no dia; média calculada sobre dias com cobertura, evitando favorecer lojas consultadas mais vezes.
4. Registrar e mostrar cobertura, número de dias e metodologia. Determinar mínimo de amostras antes de emitir classificação; histórico insuficiente deve produzir esse estado explicitamente.
5. Implementar 30/90 dias, 6 meses e 1 ano; mínimo, máximo, média, variação, última mudança e alterações recentes. Não confundir último preço histórico com oferta válida agora.
6. Gerar “O preço está bom?” por cálculo determinístico, com limiares configuráveis e referência ao período. Gemini pode auxiliar na redação, sem decidir os números.
7. Recalcular agregados após coleta/correção e invalidar cache. Preservar lacunas de disponibilidade e não unir séries de variações diferentes.

**Aceite:** troca da loja mais barata não muda indevidamente o significado do histórico; uma única amostra não recebe selo de oportunidade; gráfico, indicadores e texto usam o mesmo conjunto de dados.

### Etapa 4 — Qualidade editorial, SEO e publicação

1. Criar avaliação central que retorne `seoEligible`, `adsEligible`, pontuação, motivos de bloqueio e versão da regra. Calcular a partir dos dados atuais ou invalidar resultados persistidos quando esses dados mudarem.
2. Modelar o fluxo rascunho → importado → enriquecendo → pronto → publicado, com histórico de revisão. Avaliar se preparação deve ser um estado separado do status público existente.
3. Adotar inicialmente os pesos e cortes 70/80 do documento como configuração interna proposta, subordinados aos requisitos obrigatórios. Definir `MIN_HISTORY` por cobertura real; não há número de dias imposto pelo documento.
4. Exigir identidade, imagem válida, categoria, especificações, conteúdo original/revisado e histórico suficiente. Não usar quantidade de palavras como substituto de utilidade.
5. Resolver a exceção de indisponibilidade: produto já útil pode continuar indexável com histórico e especificações, mesmo sem oferta atual; fica sem anúncios. Produto novo/incompleto permanece `noindex`.
6. Fazer metadata, listagens e sitemap consumirem a mesma avaliação. Hoje a página verifica contagem de ofertas, o que não comprova qualidade ou oferta atual.
7. Separar sitemaps de produtos, categorias e guias sob um índice; incluir somente páginas elegíveis. Canonical, OpenGraph, Twitter Cards, breadcrumbs e dados estruturados precisam corresponder ao conteúdo visível.
8. Manter `/busca` como rota existente; `/buscar` é exemplo no requisito, não motivo para duplicar páginas. Busca arbitrária e facetas não ficam indexáveis; permitir rastreamento necessário à leitura de `noindex`.
9. Definir destino individual para duplicatas e retiradas: redirecionar somente equivalentes; usar 410 quando a retirada definitiva se justificar. Indisponibilidade temporária não causa exclusão.

**Aceite:** rascunhos e páginas incompletas não entram no sitemap; mudança de qualidade atualiza metadata e publicidade consistentemente; nenhuma avaliação, preço ou estoque é inventado em JSON-LD.

### Etapa 5 — Entregar a experiência de decisão de compra

1. Mover busca, filtros, ordenação e paginação para PostgreSQL. Avaliar índices de texto/acento e similaridade com consulta e volume reais; eliminar o limite silencioso de 300 candidatos.
2. Evoluir página de produto mantendo comparação antes do conteúdo extenso, com contexto de preço/frete, histórico, análise, especificações, cuidados e alerta da variação selecionada.
3. Fazer `/ofertas` classificar quedas pelo histórico próprio, sem confundir preço de referência da loja com desconto comprovado.
4. Criar `/menor-preco` com janela, cobertura e tolerância explícitas; `/tendencias` com métricas próprias e período definido. Omitir rankings sem base suficiente.
5. Atualizar home e categorias com introduções originais, estatísticas verificadas, marcas, oportunidades, acompanhamentos e acesso a guias; manter estados vazios úteis.
6. Criar comparação dinâmica de produtos da mesma categoria e páginas editoriais `/comparar/[slug]`. Proposta: até três itens inicialmente; tabelas usam unidades e atributos compatíveis. Combinações arbitrárias não ganham indexação automática.
7. Implementar `/guias` e páginas de guia com autoria/revisão, datas, fontes e relacionamento com categorias. Priorizar metodologia de preços e uso da ferramenta, sem meta artificial de quantidade.
8. Completar `/sobre`, `/como-funciona`, `/contato`, `/politica-de-privacidade`, `/politica-de-cookies`, `/termos-de-uso` e `/afiliados`, com informações reais do operador e da operação.

**Aceite:** usuário consegue pesquisar, escolher variação, comparar, entender o histórico e sair pelo link correto no celular; páginas continuam úteis sem links comerciais; busca encontra resultados além dos primeiros 300 candidatos.

### Etapa 6 — Alertas, comunidades e métricas

1. Migrar alertas para variação/contexto e canal de notificação; não assumir silenciosamente a variação de alertas legados ambíguos. Mostrar pendência para seleção quando necessário.
2. Homologar SMTP, cancelamento, limite e entrega; usar tentativas persistidas e idempotência. Uma reserva antes do envio não prova entrega exatamente uma vez em falhas entre serviço externo e banco.
3. Implementar push web com consentimento solicitado por ação do usuário, service worker, inscrições, revogação e remoção de endpoints expirados. Sem AdSense em notificações ou e-mails.
4. Homologar destinos por nicho, cliques de convite e distribuição Telegram. Expandir publicadores somente por capacidade comprovada, mantendo envio real desligado nos testes.
5. Antes de habilitar Facebook, cumprir `content_type`, teto de 2–3 ofertas individuais/dia/página, similaridade em 7 dias, mix semanal e alternativa de link em comentário; consultar as regras do projeto.
6. Ampliar métricas existentes para `affiliate_offer_view`, `affiliate_click`, `price_alert_created`, `product_view`, `price_chart_view` e `comparison_created`; documentar definição, dedup e retenção.
7. Definir métricas necessárias às tendências, excluindo tráfego inválido na medida viável; não tratar clique como venda ou entrada confirmada em comunidade.

**Aceite:** alerta da variação A não dispara pelo preço da B; reexecuções não geram envio indiscriminado; rankings são reproduzíveis; testes não publicam mensagens reais.

### Etapa 7 — Preparar e ativar publicidade

A interface de configuração e os pontos de integração desta etapa devem ser definidos na Etapa 4 e inseridos durante a Etapa 5. A ativação fica para depois da homologação.

1. Criar `adsConfig`, `shouldShowAds(route, pageData)` e `AdSlot`, com chave global desabilitada por padrão e política central por página.
2. Bloquear anúncios em admin, autenticação, conta, alertas, configurações, erros, páginas vazias/incompletas e produtos sem preço atual.
3. Inserir slots após comparação e histórico, separados dos CTAs. Desabilitado significa não renderizar elemento nem deixar buraco. Habilitado significa reservar dimensões responsivas antes do carregamento para reduzir CLS.
4. Implementar camada de consentimento e integração de CMP quando aplicável; controlar carregamento de Analytics/AdSense e revogação. Registrar versão da escolha e alinhar política ao comportamento real.
5. Preparar `/ads.txt` com identificador real quando disponível; nunca publicar `pub-XXXXXXXX` como configuração válida.
6. Verificar documentação oficial vigente do Google para conta, região, consentimento e posicionamento na implementação. Estes requisitos internos não garantem aprovação.
7. Validar primeiro em ambiente de teste sem tráfego artificial ou cliques em anúncios. Ativar em produção somente depois da aprovação/configuração e verificação de elegibilidade.

**Aceite:** chave global desativada elimina scripts e espaços de anúncios; páginas bloqueadas nunca carregam publicidade; consentimento e revogação funcionam; layout distingue anúncio de oferta.

### Etapa 8 — Migração, separação e operação

1. Confirmar marca, domínio, infraestrutura, SMTP e configurações de produção. Impedir URLs localhost em sitemap/canonical de produção.
2. Inventariar catálogo legado, imagens, códigos `/go`, cliques e históricos. Criar importação idempotente com IDs de origem e relatório de reconciliação.
3. Preservar URLs editoriais de casa no Meu Novo Lar; classificar conteúdos mistos e listas pelo conteúdo, não só pelo tipo. Preservar dados para revisão.
4. Publicar equivalentes no Hub antes dos redirecionamentos individuais. Retirar produtos de navegação, busca, sitemap, feeds e automações do blog; conferir que imagens editoriais continuam disponíveis.
5. Garantir builds, pipelines, variáveis e migrações independentes, sem imports locais entre repositórios. Não alterar o outro projeto nesta fase sem um lote específico de implementação.
6. Operar site e worker como serviços separados, com armazenamento persistente de criativos, fontes, backups, restauração, logs e alerta de worker parado.
7. Fazer corte gradual com reversão ensaiada. Remover campos legados somente em entrega posterior, quando não houver consumidores.
8. Homologar teclado, foco, contraste, mobile, imagens, carregamento e Core Web Vitals com e sem publicidade. Medir busca contra meta proposta de p95 ≤ 800 ms em infraestrutura e volume registrados.

**Aceite:** todos os 20 critérios originais têm evidência; migração reconcilia contagens e mantém links; projetos rodam independentemente; checklist do AdSense está satisfeito antes da solicitação, sem promessa de aprovação.

## 4. Dependências e marcos

| Marco | Dependências | Resultado |
|---|---|---|
| A — Base homologada | Etapa 0 | Código existente validado e lacunas reproduzíveis |
| B — Dados confiáveis | 1 → 2 → 3 | Identidade, ofertas e histórico corretos; iniciar acumulação real cedo |
| C — Produto público útil | B + 4 + 5 + alertas da 6 | Busca, decisão de compra e publicação por qualidade |
| D — Operação completa | C + restante da 6 + 8 | Migração, comunidades, métricas, serviços e implantação |
| E — Pronto para solicitar AdSense | C + preparação da 7 + implantação/homologação da 8 | Checklist documentado; anúncios continuam desligados |
| F — Publicidade ativa | E + aprovação e configuração reais | Liberação controlada com observação de desempenho |

Páginas institucionais e guias podem avançar enquanto o histórico acumula; análises precisam esperar dados suficientes. Integração da segunda loja depende de credenciais/capacidades reais. Não há estimativa confiável de calendário antes do Marco A e do estudo do coletor piloto.

## 5. Cobertura dos documentos

| Requisitos | Etapas responsáveis |
|---|---|
| RF-01 a RF-04: catálogo, ofertas, comparação, taxonomia | 1, 2, 5 |
| RF-05 e RF-12: comunidades, tracking e medição | 6, 8 |
| RF-06 a RF-08: conectores, coleta e rotina diária | 2, 3 |
| RF-09 a RF-11: experiência pública | 4, 5 |
| RF-13 a RF-15: conteúdo, imagens e criativos | 0, 4, 5, 6; homologar e completar módulos existentes |
| Migração, separação, operação e 20 critérios originais | 0, 8 e aceites de cada etapa |
| AdSense §§1–5, 11–16, 19–20, 29–30, 42, 44 | 1, 4, 5 |
| AdSense §§6–9, 17–18, 34–36, 43 | 2, 3, 5 |
| AdSense §§10 e 41 | 6 |
| AdSense §§14, 27–28, 31–33, 38, 45–46 | 4 |
| AdSense §§21–26, 37, 39–40 | 7, 8 |
| AdSense §§47–50: princípios e checklist final | Todas; fechamento em 8 e Marco E |

## 6. Verificação por entrega

- Após qualquer mudança de código: `npx tsc --noEmit -p tsconfig.json`. Após schema: executar `npx prisma generate` antes do typecheck.
- Testes de domínio: equivalência, elegibilidade, condições, históricos com lacunas, cálculos, qualidade e publicidade.
- Testes com PostgreSQL: unicidade, concorrência, retomada de jobs, importação idempotente, séries, filtros/paginação e migrações.
- Testes de fluxo: admin → importação/revisão → publicação → busca → variação → comparação → `/go`; alerta → entrega/cancelamento; conteúdo → criativo → invalidação.
- SEO: renderização, sitemap seletivo, canonical, noindex e JSON-LD coerentes. Publicidade: páginas permitidas/proibidas, consentimento e layout.
- Rodar build com serviços necessários disponíveis; registrar limitações externas sem substituir homologação por mocks.

## 7. Decisões a fechar durante o trabalho

| Decisão | Momento limite | Premissa de planejamento |
|---|---|---|
| Marca/domínio e responsável institucional | Antes do conteúdo institucional final e implantação | Affiliate Hub como nome de trabalho |
| Segunda loja e acesso autorizado | Etapa 2 | Estudo do ML existente; escolher por capacidade comprovada |
| Semântica de preço/histórico e estoque desconhecido | Etapas 1–3 | Contextos separados, cobertura explícita, nenhuma inferência de estoque confirmado |
| Mínimo de histórico e cortes de qualidade | Etapas 3–4 | Configuração versionada; dados insuficientes não geram selos |
| Aprovação editorial e fusão | Etapas 1 e 4 | Revisão humana inicial |
| Hospedagem, SMTP, push e público geográfico | Antes de homologar 6–8 | Serviços independentes, publicidade desligada |
| Destinos legados e migração de conteúdo misto | Etapa 8 | Inventário individual; preservar para revisão |

**Primeiro lote recomendado:** Etapa 0, seguida da correção de contexto comercial/variação da Etapa 1 e do contrato de observações da Etapa 3. Isso permite acumular histórico confiável enquanto as páginas e a camada de qualidade são construídas.
