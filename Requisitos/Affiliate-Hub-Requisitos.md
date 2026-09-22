# Affiliate Hub — requisitos de produto e direção de layout

Versão 1.2 · 16/09/2026 · Base: brunoblv/affiliate-hub

## 1. Objetivo e escopo

Transformar o projeto em uma plataforma pública de descoberta de produtos e comparação de preços entre lojas, com monetização pelos links de afiliado do proprietário. O visitante pesquisa ou navega por nichos, conhece o produto, compara ofertas equivalentes e conclui a compra na loja escolhida. Não haverá checkout próprio nesta fase.

O Affiliate Hub será um projeto separado, dedicado ao catálogo, à busca e à comparação. O Meu Novo Lar continuará em meunovolar.com como blog exclusivamente sobre casa, sem catálogo, ofertas ou posts de produtos. O domínio do blog permanece; o domínio público do Affiliate Hub ainda será definido.

### Separação obrigatória entre os projetos

| Projeto | Conteúdo e funcionalidades |
|---|---|
| Meu Novo Lar — meunovolar.com | Blog editorial sobre casa: organização, decoração, limpeza, manutenção e temas relacionados. Sem catálogo, busca de produtos, comparador, vitrines comerciais ou posts de produtos. |
| Affiliate Hub — domínio a definir | Produtos, variações, ofertas, comparação de preços, busca de produtos, nichos, conteúdo de produto com Gemini, criativos e comunidades. |

- Manter a identidade, navegação e experiência editorial do Meu Novo Lar. Sua busca, se mantida, pesquisa somente artigos sobre casa.
- Decisão confirmada: Meu Novo Lar e Affiliate Hub terão repositórios separados, com aplicações, builds, implantações e configurações próprias. O Affiliate Hub não será uma seção dentro de meunovolar.com. O usuário fará a separação dos repositórios; este documento não pressupõe que ela já foi executada.
- Reaproveitar código pertinente durante a separação, mantendo no repositório do Meu Novo Lar o CMS e recursos editoriais sobre casa; no Affiliate Hub, catálogo, ofertas, conectores, comparação, conteúdo de produto, criativos e comunidades. Serviços compartilhados, se necessários, devem ter contratos explícitos; nenhum projeto pode depender de imports de arquivos do outro repositório. Compartilhamento interno não pode fazer produtos reaparecerem no blog.
- Cada repositório deve possuir suas variáveis de ambiente, pipeline, documentação de execução e migrações sob responsabilidade definida. A separação física dos bancos ainda não foi decidida; até essa decisão, nenhuma migração pode remover tabelas ou dados usados pelo outro projeto.
- Inventariar e transferir as mídias necessárias, evitando que imagens do blog dependam de arquivos removidos durante a separação. Credenciais e sessões não devem ser copiadas para arquivos versionados.
- Preservar URLs dos artigos editoriais sobre casa que permanecerem, além de imagens, datas e metadados.
- Retirar do Meu Novo Lar páginas de produto, catálogo, ofertas, vitrines, cards de produtos e listas cujo propósito seja divulgar produtos. Revisar posts do tipo LISTA pelo conteúdo; o tipo sozinho não define se um artigo é editorial ou comercial.
- Artigos mistos devem ser revisados: manter a parte editorial sobre casa e remover blocos comerciais de produtos. Conteúdo fora do tema casa não integra o blog resultante; preservar dados para revisão ou transferência, sem exclusão automática.
- Migrar páginas de produto úteis para o Hub com mapeamento individual de URLs. Redirecionar apenas para páginas equivalentes já publicadas; quando não houver substituto, definir retirada da URL sem redirecionamento genérico para a home.
- Remover conteúdo comercial das listagens, busca, menus, sitemap e feeds do Meu Novo Lar. Desativar para esse projeto tarefas que criem posts de produto, vitrines ou insiram cards de produto em artigos.
- Manter separados os prompts editoriais, sitemaps, URLs canônicas, analytics e configurações de publicação dos dois projetos.
- Outros projetos existentes, como o Mago da Meia Noite, permanecem fora dessa reorganização.

Este documento especifica o que construir; não representa implementação nem auditoria completa das integrações. Requisitos essenciais estão no MVP; sugestões adicionais estão identificadas.

## 2. Diagnóstico do repositório

Arquivos consultados na branch main: README.md, package.json, prisma/schema.prisma e lib/produtos.ts.

| Evidência | Implicação |
|---|---|
| Produto possui plataforma, idExterno, precoAtual, linkAfiliado e codigoCurto | Hoje produto e oferta estão misturados. Separar antes de construir o comparador. |
| Histórico de preço vinculado ao Produto | Migrar para a oferta, mantendo a origem de cada observação. |
| Categoria, Destino e Plataforma são enums | Nichos, categorias e lojas precisam de cadastros configuráveis; conectores continuam sendo implementações de código. |
| HOME_CATEGORIAS e produtoVisivelNoSite limitam o catálogo ao destino e tema | Substituir a regra global de casa por regras explícitas de publicação por nicho/projeto. |
| chaveCanonicoProduto remove números isolados e palavras como kit/unidades | Não usar essa chave para unir produtos automaticamente: volume e quantidade podem mudar a identidade do item. |
| Há Canal, Publicacao, Clique, Midia e Credencial | Evoluir esses recursos, preservando dados e rastreabilidade. |
| package.json declara Next.js, Prisma/PostgreSQL, Sharp e scripts de workers | Aproveitar a stack existente. README menciona Redis/BullMQ, mas essas dependências não constam no package.json consultado; verificar workers reais antes de decidir a fila. |

Não foi verificada a execução das APIs, dos workers ou das publicações. Comentários no schema e README não comprovam funcionamento em produção.

## 3. Conceito central: produto, variação e oferta

**Produto canônico:** cadastro único de uma identidade comercial, com nome, marca, modelo, descrição, fotos, categorias e conteúdo editorial.

**Variação:** combinação comparável de atributos como cor, tamanho, voltagem, capacidade, peso, volume, quantidade e condição. Mesmo um item sem opções deve possuir uma variação padrão.

**Oferta:** anúncio específico de uma loja/vendedor, associado à variação, com seu link de afiliado, preço, disponibilidade e histórico. Um produto pode ter muitas ofertas, inclusive várias da mesma loja.

Exemplo: um reparador de pontas de determinada marca/modelo tem uma variação de 30 ml. Essa variação pode ter dois vendedores na Shopee, um na Amazon e um no Mercado Livre. O frasco de 60 ml é outra variação; um kit com três frascos não deve concorrer como se fosse uma unidade.

### RF-01 — Cadastro canônico

- Criar, editar, publicar, despublicar e arquivar produtos.
- Campos: nome, slug estável, marca, modelo, identificadores GTIN/EAN quando existentes, resumo, atributos, categorias, nichos, imagens e estado editorial.
- Aceitar cadastro manual, importação por URL e importação por conector.
- Ao importar, permitir vincular a um produto existente ou criar outro.
- Sugerir correspondências por identificadores e atributos; títulos semelhantes sozinhos não autorizam fusão.
- Disponibilizar revisão, união e desmembramento de cadastros, com registro dos IDs anteriores e redirecionamentos de páginas.

### RF-02 — Ofertas e links de afiliado

- Permitir várias ofertas por produto, por variação e por loja, sem limite de uma oferta por plataforma.
- Guardar loja, vendedor, ID do anúncio, ID da variação externa, URL original, URL de afiliado e código de redirecionamento.
- Guardar preço por oferta/link, moeda, preço de referência informado pela loja, forma de pagamento, parcelas, cupom, condições, frete quando conhecido e estoque/disponibilidade.
- Permitir links alternativos de rastreamento para o mesmo anúncio, sem contá-los como novas ofertas ou novas lojas. Quando representam a mesma condição comercial, compartilhar a coleta de preço.
- Diferenciar preço geral de condições como primeira compra, app, clube, Pix e cupom.
- Registrar fonte, data de coleta, última tentativa, última atualização bem-sucedida e validade estimada.
- Preços devem usar Decimal ou centavos inteiros; nunca ponto flutuante para cálculo financeiro.

### RF-03 — Comparação correta

- Mostrar preço e condições de cada oferta, vendedor, loja, disponibilidade e botão “Ver na loja”.
- Ordenação padrão: menor preço entre ofertas atuais, disponíveis e equivalentes.
- Exibir “Menor preço entre as ofertas monitoradas”; não prometer cobertura de toda a internet.
- Preço sem frete deve estar identificado. Frete desconhecido não é zero.
- Comparar total com frete somente quando houver dados para o mesmo CEP/contexto; consulta de CEP é evolução opcional.
- Preços condicionais devem ficar identificados e não substituir silenciosamente o preço acessível ao público geral.
- Calcular menor preço por variação. Card do produto pode exibir “A partir de”, indicando que há variações.
- Não misturar usado com novo, kit com unidade ou modelos diferentes.
- Mostrar número de ofertas e número de lojas como métricas distintas.
- Comissão não altera a ordenação padrão por preço; destaques comerciais precisam de identificação própria.
- Ofertas vencidas ou sem estoque não disputam o menor preço atual. A página pode permanecer disponível com estado “Sem ofertas atualizadas”.

## 4. Nichos, categorias e comunidades

### RF-04 — Taxonomia própria

- Cadastrar nichos no admin, com nome, slug, descrição, ícone, cor, ordem e status.
- Exemplos iniciais: Moda feminina; Construção e ferramentas; Móveis; Beleza e cuidados pessoais; Casa e cozinha; Eletrônicos. São exemplos editáveis, não uma lista fechada.
- Cadastrar categorias/subcategorias hierárquicas. Um produto pode participar de mais de um nicho, mantendo um cadastro único.
- Não confundir nicho, categoria comercial da loja e destino de divulgação.
- Manter tabela de correspondência: provedor + ID/caminho de categoria externa → categoria interna/nicho.
- Importar categorias da Shopee conforme os campos efetivamente disponíveis na integração. Taxonomia interna não deve depender da Shopee.
- Categorias externas desconhecidas entram em fila de classificação. IA pode sugerir classificação, com confiança e revisão.
- Preservar mapeamentos quando o nome externo mudar; identificar categorias removidas ou sem correspondência.

### RF-05 — Grupos e canais por nicho

- Suportar separadamente grupo WhatsApp, canal WhatsApp, grupo Telegram e canal Telegram.
- Cada destino contém plataforma, tipo, nome, link público de entrada, identificador de publicação quando disponível, status e vínculo com o nicho.
- Suportar mais de um destino do mesmo tipo por nicho e destinos ainda não configurados.
- Mostrar CTAs contextuais nas páginas de nicho e produto, sem exigir entrada para comparar preços.
- Registrar cliques de entrada por nicho e canal. Clique não comprova que a pessoa ingressou.
- Reaproveitar distribuição existente, relacionando publicações ao nicho, produto e oferta usada.
- Manter horários, limites, prevenção de duplicação e histórico de falhas. Vincular um convite não significa que o canal suporta publicação automática.
- A expansão de publicadores é incremental conforme a capacidade comprovada de cada integração; cadastro e links públicos fazem parte do MVP.

## 5. Integração centralizada entre lojas

### RF-06 — Contrato comum de conectores

Todas as lojas devem entregar um formato normalizado. A interface pública e o catálogo não devem conhecer campos específicos da Shopee ou de outro fornecedor.

Capacidades independentes: buscar produtos; consultar anúncio; consultar preço/estoque; importar categorias; obter imagens; gerar link afiliado; consultar ofertas em lote. Cada conector declara o que realmente suporta. Ausência de uma capacidade não bloqueia cadastro manual nem leitura de preços por outro coletor.

Saída normalizada mínima: provedor, vendedor, IDs externos, URL original, título, atributos da variação, imagens, categoria externa, preço, moeda, condição de pagamento, disponibilidade, instante observado, método e confiança da coleta.

Manter separadas a geração de link afiliado e a obtenção do preço: uma fonte pode fornecer preço sem conseguir gerar links. Preservar o link afiliado validado nas atualizações.

### RF-07 — API, coleta web e importação assistida

Ordem sugerida por loja, configurável após estudo técnico:

1. API disponível e habilitada para a conta.
2. Dados estruturados da página (JSON-LD ou estado serializado), quando representarem o anúncio/variação corretos.
3. HTML e seletores versionados.
4. Navegador automatizado para conteúdo dinâmico e sessão autenticada, utilizando cookies da conta autorizada quando necessários.
5. Coleta assistida via Work/Cowork ou importação manual de HTML/JSON/CSV como contingência.

O estudo por loja deve inspecionar página, requisições utilizadas pelo próprio site, identificadores, paginação, variações e contexto de sessão. Registrar se o valor depende de localização, login, cupom ou primeira compra. Não implementar um scraper genérico que capture o primeiro “R$” da página.

Cookies e sessões ficam em credenciais do servidor, separados por loja, com renovação manual/assistida e estado “Sessão expirada”. Não colocar cookies em prompts, HTML público ou logs. Uma sessão expirada gera pendência de operação, sem substituir preço por zero.

Cada extrator precisa de amostras de validação, versão e checagem do ID/variação. Ao detectar layout desconhecido ou preço ambíguo, encaminhar à revisão. Guardar evidência mínima e origem da observação, sem arquivar dados privados da sessão.

Work/Cowork é contingência assistida até existir integração executável validada; não presumir que ficará disponível como serviço diário na VPS. O requisito de atualização automática deve ser atendido pelo conector/worker de produção, e exceções devem aparecer no painel.

Cadastrar uma loja nova no admin não cria automaticamente um conector. Lojas sem integração podem operar inicialmente com ofertas manuais e coletas assistidas.

### RF-08 — Rotina diária de preços

- Cada oferta ativa deve ser programada para atualização ao menos uma vez a cada 24 horas, respeitando capacidade da origem; falhas precisam ficar visíveis.
- Distribuir trabalho em lotes durante o dia e priorizar ofertas vencidas, acessadas e em divulgação.
- Sugestão inicial: iniciar ciclo às 03h, fuso America/Sao_Paulo, com janela escalonada e tentativas posteriores; horário e concorrência configuráveis.
- Rodar fora das requisições públicas, em processo separado, com fila persistente, deduplicação, lock/lease e recuperação após reinício.
- Aplicar limites por conector, timeout, retentativas progressivas e pausa de fontes com falhas persistentes.
- Distinguir indisponibilidade do anúncio de falha de rede/coleta. Preservar último preço conhecido quando houver erro, marcando-o como desatualizado.
- Proposta inicial de validade: 24 horas, ajustável por fonte. Após expirar, deixar de apresentar o valor como oferta atual garantida.
- Atualizar oferta, histórico e agregados de comparação de forma consistente; invalidar cache após conclusão.
- Manter observação datada por coleta bem-sucedida, mesmo sem mudança, ou lastChecked equivalente; distinguir isso do histórico de alterações.
- Exigir revisão para moeda inesperada, preço não positivo ou variação abrupta configurável. Não publicar o valor suspeito automaticamente.
- Painel: total previsto, processado, atualizado, falhou, vencido, sem estoque e sessão expirada; permitir reprocessar por loja/oferta.
- Antes de gerar/publicar criativo com preço, conferir a validade da oferta e atualizar quando necessário.

## 6. Experiência pública

### RF-09 — Home e páginas de nicho

- Home com proposta curta, busca proeminente, navegação por nichos, ofertas atualizadas e acesso às comunidades.
- Cada nicho tem URL própria, descrição breve, subcategorias, produtos, filtros e seus convites.
- Cards exibem foto real, nome, variação quando relevante, menor preço elegível, quantidade de lojas e ação “Comparar preços”.
- Lista de produtos paginada; não carregar o catálogo inteiro.
- Contadores, selos de popularidade e descontos precisam de dados verificáveis. Sem números fictícios.

### RF-10 — Busca

- Busca global por nome, marca, modelo, identificador e termos associados.
- Dentro de nicho, mostrar claramente o filtro aplicado e permitir removê-lo.
- Normalizar caixa e acentos; permitir sinônimos e tratamento de erros simples conforme a solução adotada.
- Filtros: nicho/categoria, loja, faixa de preço, disponibilidade e atributos aplicáveis à categoria.
- Ordenar por relevância, menor preço e atualização recente. Popularidade apenas se houver métrica definida.
- Faixa e ordenação de preços usam ofertas elegíveis da variação/contexto exibido.
- Produto com várias ofertas aparece uma vez, não uma vez por vendedor.
- Sem resultados: mostrar termo, opção de remover filtros e sugestões pertinentes.
- Para o MVP, avaliar busca indexada no PostgreSQL; adotar serviço dedicado somente se volume/latência exigirem.

### RF-11 — Página de produto

URL sugerida: /produto/[slug]. Elementos:

1. Breadcrumb e galeria de fotos.
2. Nome, marca/modelo, resumo e escolha de variação.
3. Menor preço elegível e comparação de ofertas visível antes de textos extensos.
4. Loja, vendedor, condições, atualização e botão por oferta.
5. O que é, benefícios verificáveis, para quem faz sentido, como usar, cuidados e especificações.
6. Evidências de popularidade quando disponíveis, com fonte e data.
7. FAQ, produtos relacionados e comunidade do nicho.

Todas as ofertas devem permanecer acessíveis, inclusive várias da mesma loja. Agrupar visualmente por loja é permitido, sem ocultar a comparação de vendedores. Histórico visual é uma evolução recomendada; armazenar histórico desde o MVP.

### RF-12 — Redirecionamento e medição

- Evoluir /go/[codigo] para identificar a oferta/link escolhido.
- Registrar produto, oferta, loja, nicho e origem do clique quando conhecida.
- Não substituir a oferta escolhida por outra silenciosamente.
- Link desativado deve apresentar estado compreensível e acesso à comparação atual.
- Medir busca, visualização, clique de oferta, ausência de resultados e clique em comunidade.
- Receita/comissão somente quando houver confirmação/importação correspondente; clique não equivale a venda.

## 7. Conteúdo com Gemini

### RF-13 — Geração editorial por produto

- Usar API do Gemini via serviço no servidor, com modelo configurável e saída estruturada validada.
- Gerar título editorial, resumo, descrição, benefícios, público indicado, modo de uso, limitações/cuidados, FAQ e metadados.
- “Por que é bom” deve explicar características e aplicações reais; “por que é famoso” só aparece com evidência de popularidade. Na ausência de evidência, omitir ou usar “Destaques do produto”.
- Fornecer ao modelo apenas dados do produto selecionado, instruções do fabricante, atributos, fontes e métricas verificadas.
- Não inventar experiência pessoal, testes, avaliações, vendas, certificações ou alegações de saúde.
- Instruções de uso precisam respeitar o material do fabricante; se ausentes, registrar pendência, sem criar procedimento específico como fato.
- Guardar fontes, modelo, versão do prompt, entrada utilizada, data, estado e custo estimado quando disponível.
- Fluxo: pendente → gerando → rascunho → revisado → publicado; falha permite retry sem duplicar página.
- Editor pode alterar seções e regenerar partes. Conteúdo editado manualmente deve permanecer protegido de sobrescrita automática.
- Preço é bloco dinâmico do banco, não texto fixo produzido pelo Gemini.
- Não regenerar artigo diariamente por mudança de preço. Regenerar mediante alteração relevante de atributos/fontes ou ação editorial.
- Regras próprias por nicho, mantendo o mesmo formato editorial central.

## 8. Imagens e capas

### RF-14 — Fotos de produto

- Guardar URLs originais, fonte, vínculo com produto/variação/oferta, ordem, capa, texto alternativo e data de verificação.
- Remover URLs duplicadas e permitir ordenar/trocar imagens no admin.
- Tratar URLs quebradas/expiradas sem interromper a página.
- Cache/proxy de imagem pode ser usado conforme necessidade; preservar sempre a origem.
- A foto de outra variação não pode representar silenciosamente o item comparado.

### RF-15 — Capas para páginas e posts

- Compor templates com foto real do produto, identidade do Hub, nome curto, nicho e CTA.
- Formatos iniciais propostos: 1200×630 para compartilhamento, 1080×1350 para feed, 1080×1920 para stories e 1080×1080 para distribuição quadrada.
- Permitir capa sem preço e capa de oferta com preço datado/condicionado. Não inserir selo de desconto sem referência válida.
- Usar composição determinística, aproveitando Sharp ou renderizador equivalente; IA é opcional para cenário/fundo e não deve alterar produto, rótulo, cor ou modelo.
- Guardar template, versão, produto, oferta quando aplicável, preço usado e instante da geração.
- Prever prévia, aprovação, regeneração, download e uso na distribuição existente.
- Mudança de preço invalida criativos pendentes que exibam valor antigo. Publicações já enviadas mantêm registro do valor de seu momento.

## 9. Administração e modelo de dados proposto

Admin organizado em: Visão geral; Produtos; Ofertas; Nichos e categorias; Lojas e integrações; Sincronizações; Conteúdo; Criativos; Comunidades; Distribuição; Métricas.

| Entidade | Responsabilidade |
|---|---|
| Produto | Identidade única e conteúdo comum |
| VariacaoProduto | Atributos que determinam equivalência de comparação |
| Loja / Vendedor | Plataforma e vendedor do anúncio |
| Oferta | Anúncio, variação, preço atual e disponibilidade |
| LinkAfiliado | URL de afiliado, etiqueta e código público da oferta |
| ObservacaoPreco | Preço, contexto, fonte, validade e data da coleta |
| Nicho / Categoria / ProdutoNicho | Navegação e classificação interna |
| MapeamentoCategoriaExterna | Correspondência das taxonomias de lojas |
| ImagemProduto | URL, origem, variação, ordem e alt |
| ConteudoProduto | Seções editoriais, versão, fontes e estado de revisão |
| Canal / NichoCanal | Convite, tipo e destino de distribuição |
| Criativo | Arquivo, template, oferta/preço e estado |
| ExecucaoSincronizacao | Fila, tentativas, resultados e falhas |
| Clique | Rastreamento da oferta ou comunidade acessada |

Oferta terá unicidade conforme provedor + vendedor + anúncio + variação + contexto comercial; não apenas produto + loja. Links etiquetados de campanha não criam histórico de preço artificialmente independente para o mesmo anúncio.

Esses nomes são conceituais. A implementação deve reaproveitar entidades existentes quando sua semântica comportar a mudança, sem criar dois catálogos concorrentes.

## 10. Migração e compatibilidade

1. Inventariar rotas públicas, consumidores externos, workers, integrações e dependências de Produto/Destino/Categoria.
2. Verificar regras antigas em instruções do projeto e marcar explicitamente quais se limitam aos sites anteriores. O Hub não herda a restrição global “somente casa”.
3. Criar tabelas novas por migração aditiva; fazer backup e ensaio antes da transição.
4. Converter cada produto atual em produto canônico + variação padrão + oferta + link, preservando IDs de origem e código /go.
5. Migrar histórico para a oferta original. Não misturar séries de anúncios diferentes.
6. Migrar imagens, cliques e relações com posts/publicações. Não mover cliques antigos para uma loja diferente.
7. Mapear categorias/destinos para nichos e canais mediante tabela explícita; itens ambíguos ficam pendentes.
8. Identificar possíveis duplicatas, revisar e unir apenas produtos equivalentes. Preservar registros das fusões.
9. Desativar para o Hub filtros e rotinas que excluam produtos por estarem fora do tema casa; revisar especificamente o script catalogo:purgar-nicho antes de qualquer execução.
10. Migrar interface/admin e manter compatibilidade temporária para outros sites consumidores. Não alterar o Mago da Meia Noite ou outros destinos por efeito colateral.
11. Preservar meunovolar.com como blog sobre casa e suas URLs editoriais. Implantar o Affiliate Hub como projeto separado, em domínio a definir. Inventariar páginas comerciais do blog, migrar as pertinentes e redirecionar individualmente apenas para equivalentes publicados no Hub. Remover catálogo, posts de produtos, vitrines e blocos comerciais da experiência do blog, inclusive busca, sitemap, feeds e automações.
12. Fazer corte gradual com contagens reconciliadas e plano de retorno à leitura anterior. Remover campos antigos somente após validação.

## 11. Direção visual para Claude Design

**Conceito: um guia de compras moderno, claro e confiável, com fotografia de produto e comparação em destaque.** Affiliate Hub é o nome de trabalho; a marca pública pode ser definida depois sem afetar o catálogo.

Paleta proposta: fundo #F7F8FA; superfícies #FFFFFF; texto #17212B; ação principal verde-petróleo #087F6D; cor secundária âmbar #F4B942 para detalhes com texto escuro. Validar contraste em cada combinação. Fonte sugerida: Inter ou equivalente sem serifa.

Cards com bordas discretas, cantos de 12–16 px, sombras leves e espaço em branco. Fotos sobre fundo neutro; evitar gradientes dominantes e excesso de selos. Identidade central única, com pequenos acentos por nicho.

### Telas solicitadas ao Claude Design

| Tela | Composição |
|---|---|
| Home desktop | Cabeçalho com marca e busca ampla; linha de nichos; frase “Encontre o produto. Compare as ofertas.”; produtos em grid; comunidades por interesse |
| Home mobile | Marca compacta; busca larga; nichos roláveis; cards legíveis; acesso rápido a comunidades |
| Nicho | Título, breve contexto, subcategorias, filtros laterais no desktop e drawer no mobile; listagem com preço e lojas |
| Busca | Termo, contagem, filtros ativos removíveis e resultados sem duplicar produtos |
| Produto desktop | Galeria à esquerda e nome/variação/resumo à direita; comparação imediatamente abaixo; conteúdo por seções |
| Produto mobile | Galeria, nome, variação, menor preço e lista vertical de ofertas; CTA fixo “Comparar ofertas” quando útil, sem cobrir conteúdo |
| Comunidades | Cards por nicho e quatro tipos de destino quando disponíveis, com identificação clara de grupo/canal |
| Admin produto | Editor com abas Dados, Variações, Ofertas, Imagens, Conteúdo e Criativos; indicadores de pendências |

Na tabela de comparação, destacar preço e botão sem esconder loja, vendedor, variante ou condição. No mobile, transformar linhas em cards, evitando rolagem horizontal. Informações de atualização devem ficar próximas ao valor.

Entregar estados: carregando, sem imagem, sem resultado, sem ofertas atuais, estoque indisponível, preço condicionado, texto ainda não publicado e falha de atualização. Implementar navegação por teclado, foco visível, rótulos e contraste adequado.

Briefing pronto: “Crie um comparador de preços brasileiro chamado Affiliate Hub, multínicho, com busca como principal entrada e um cadastro único por produto. A experiência deve ajudar a escolher uma variação, comparar ofertas de diferentes lojas e vendedores e entrar em comunidades por interesse. Use fundo claro, verde-petróleo, tipografia legível e fotos reais. Priorize comparação acima do conteúdo editorial. Desenhe home, nicho, busca, produto, comunidades e editor administrativo em desktop e mobile. Mostre condições de preço e atualização sem poluir a interface. Inclua estados vazios e indisponíveis. Não use métricas fictícias nem aparência de blog como estrutura principal.”

## 12. Requisitos de operação e qualidade

- Catálogo público pode ser consultado sem login; administração exige autenticação e permissões.
- Páginas servem dados persistidos/cacheados; não chamar várias lojas ou Gemini a cada visita.
- Separar processamento pesado e navegador automatizado do processo de atendimento do site; configurar concorrência conforme recursos disponíveis.
- Metas propostas: busca com p95 de até 800 ms no servidor, em volume e infraestrutura registrados no teste; observar métricas reais antes de ampliar o catálogo.
- Logs estruturados por conector/oferta/job, sem segredos; métricas de cobertura e idade dos preços.
- Conteúdo de fontes externas e respostas da IA são dados, nunca instruções operacionais; sanitizar conteúdo renderizado.
- Buscar URLs externas somente de origens previstas, validar redirecionamentos e impedir acesso a endereços internos do servidor.
- Publicação indexável exige página útil, identidade correta e conteúdo revisado. Evitar indexar combinações infinitas de filtros e rascunhos.
- URLs canônicas, sitemap de páginas publicadas, metadados e marcação estruturada coerentes com dados visíveis. Detalhes de SEO técnico devem ser verificados na implementação.
- Manter aviso simples de monetização por afiliados e de que preço/disponibilidade finais são confirmados na loja.

## 13. Ordem de implementação

| Etapa | Entrega e dependência |
|---|---|
| 1 — Fundação | Inventário, migração aditiva, produto/variação/oferta, nichos e cadastro manual multiloja |
| 2 — Dados atuais | Contrato de conectores, Shopee validada, ciclo diário, histórico e um coletor web piloto |
| 3 — Site comparador | Home, busca, nichos, páginas de produto, comparação e tracking por oferta |
| 4 — Conteúdo e criativos | Gemini com revisão, galeria, templates e invalidação por mudança de preço |
| 5 — Comunidades e separação dos projetos | CTAs por nicho, adaptação da distribuição, implantação própria do Hub e manutenção do Meu Novo Lar como blog exclusivamente sobre casa |

O MVP completo contempla as cinco etapas. Novas lojas entram por capacidade comprovada, sem bloquear a base multiloja. Não prometer que todas terão atualização automática antes do estudo de cada fonte.

Evoluções opcionais: alerta de preço para usuários, favoritos, consulta de frete por CEP, histórico visual, extensão de captura assistida e recomendações personalizadas. Não são dependências do MVP.

## 14. Critérios de aceite

1. Cadastrar um produto com quatro ofertas, incluindo duas da mesma loja; exibir um único produto e todas as ofertas.
2. Comparar separadamente variações de 30 ml/60 ml, unidade/kit e novo/usado.
3. Alterar preço de uma oferta e verificar que as demais e seus históricos permanecem intactos.
4. Cadastrar dois links de campanha do mesmo anúncio sem duplicar contagem de lojas nem gerar falsas ofertas.
5. Buscar com/sem acento e localizar o produto; filtrar por nicho sem duplicações.
6. Criar nicho e associar categorias/canais pelo admin sem alterar enums no código.
7. Importar categorias externas sem correspondência e encaminhá-las à revisão.
8. Executar ciclo diário, interromper/reiniciar worker e concluir sem duplicar jobs/observações de uma mesma execução.
9. Simular falha de API, HTML alterado e cookie expirado: preservar dado anterior, sinalizar validade e registrar pendência.
10. Oferta vencida, indisponível ou incompatível não determina o menor preço atual.
11. Gemini não inventa popularidade quando faltam evidências, não insere preço fixo e não sobrescreve edição protegida.
12. Gerar capa em todos os formatos; mudança de preço invalida a versão ainda não publicada.
13. Cada botão de loja usa seu link afiliado e registra a oferta correta.
14. Cada nicho mostra seus grupos/canais; clique é medido sem ser tratado como adesão confirmada.
15. Migração preserva códigos públicos, históricos e relações, com contagens reconciliadas e retorno testado.
16. Validar o fluxo completo no celular: buscar → selecionar produto/variação → comparar → abrir loja.
17. meunovolar.com mantém os artigos editoriais sobre casa nas URLs preservadas e não exibe catálogo, comparador, cards comerciais ou posts de produtos em nenhuma listagem, busca, sitemap ou feed.
18. Jobs e geração com Gemini do Affiliate Hub não criam nem publicam produtos no Meu Novo Lar.
19. Os dois projetos possuem repositórios separados e podem ser construídos e implantados independentemente, sem imports locais entre repositórios; navegação, busca e configuração do blog não dependem da interface comercial do Hub.
20. URLs comerciais antigas possuem destinação individual registrada; artigos editoriais mantidos não são redirecionados ao Hub.

## 15. Pontos a decidir durante a implementação

- Marca e domínio públicos definitivos do Affiliate Hub; meunovolar.com já está definido como domínio do blog sobre casa.
- Lojas prioritárias, credenciais e capacidades efetivamente disponíveis em cada conta.
- Política de aprovação editorial e de associação automática entre anúncios/produtos.
- Catálogo inicial e capacidade real de coleta diária da infraestrutura.
- Quais destinos legados continuarão consumindo o backend.

Essas decisões não impedem iniciar a modelagem e a direção visual. Até serem definidas, adotar marca de trabalho Affiliate Hub, taxonomia editável, BRL como moeda inicial e America/Sao_Paulo como fuso operacional.

## Referências do projeto

- https://github.com/brunoblv/affiliate-hub/blob/main/prisma/schema.prisma
- https://github.com/brunoblv/affiliate-hub/blob/main/lib/produtos.ts
- https://github.com/brunoblv/affiliate-hub/blob/main/package.json
- https://github.com/brunoblv/affiliate-hub/blob/main/README.md

As capacidades de API descritas são requisitos a validar por conector, não uma afirmação de disponibilidade atual de endpoints ou permissões.
