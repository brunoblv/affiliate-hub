# Métricas do Hub — etapa 6c

Painel em `/admin/metricas`, restrito a administradores no servidor. Períodos de 7, 30 e 90 dias corridos, incluindo o dia atual, no fuso America/Sao_Paulo. Totais, taxa de buscas sem resultado, série diária e rankings são calculados no banco, com uma leitura consistente; nenhum número demonstrativo é exibido.

## O que é contado

- **Busca/consulta:** primeira página de resultados de `/busca` aberta em uma aba visível. Inclui navegação com filtros e sem termo; paginação não cria uma nova busca. A contagem de resultados é a mesma devolvida pelo catálogo, já considerando filtros e seu limite atual de candidatos.
- **Sem resultado:** subconjunto das buscas cujo total é zero. Não é um segundo evento inserido. Taxa = buscas sem resultado / buscas; sem buscas, mostrar `—`.
- **Visualização de produto:** página de produto publicado aberta em aba visível. Mudanças de variante e ações na mesma montagem da página não contam novas visualizações. `generateMetadata` e prefetch não emitem eventos.
- **Clique de oferta:** histórico existente de `/go/[code]`, por oferta/produto/loja. Não presume compra ou comissão. Cada link mantém a oferta escolhida.
- **Clique de comunidade:** histórico existente de `/comunidades/entrar/[id]`, por comunidade e nicho preservado no momento do clique. Não comprova adesão.

Visualizações não identificam pessoas: **não são visitantes únicos**. Revisitas que reutilizam o mesmo token do cache do navegador são deduplicadas; eventos podem não chegar com JavaScript desabilitado, falha de rede, bloqueadores ou aba que só fique visível após o token expirar. GETs comuns de robôs ainda podem estar nos cliques. HEAD e prefetch sinalizados deixam de incrementar cliques após esta etapa, sem reescrever dados históricos.

## Coleta

O servidor emite um token HMAC usando `AUTH_SECRET`, com escopo próprio, ID aleatório e validade de 30 minutos. Dados de produto, nicho e resultados vêm da consulta do servidor. O navegador envia esse token por POST somente quando a página fica visível. Repetições têm o mesmo ID e são ignoradas pela chave primária do banco (`createMany` com `skipDuplicates`). A API recusa origem externa, assinatura inválida, dados alterados, token vencido e corpo acima de 2 KB. O token não identifica usuário, navegador ou sessão.

Não se armazenam IP, cookie, user-agent ou ID do usuário no evento. Termos são normalizados e limitados a 120 caracteres. Padrões de e-mail, URL e sequências numéricas longas são substituídos por `[termo omitido]`; isso não é uma garantia de anonimização de qualquer texto livre. Rankings mostram nomes atuais quando disponíveis e identificam registros retirados sem transferir seu histórico a outros itens.

Sem `AUTH_SECRET`, buscas e visualizações não são emitidas e o painel mostra aviso. Falha no endpoint de métricas não interrompe a compra ou a busca. Não há integração de receita/comissão, cookies analíticos, serviço externo ou exclusão automática de histórico nesta entrega.

## Instalação e validação

1. Iniciar o PostgreSQL do Hub e executar `npx prisma migrate deploy` (também aplica as migrações pendentes de comunidades/distribuição).
2. Executar `npx prisma generate` e `npx tsc --noEmit -p tsconfig.json`.
3. Configurar `AUTH_SECRET`, iniciar o site e abrir uma busca, uma busca vazia e um produto em abas visíveis. Repetir o mesmo POST não pode duplicar o ID; abrir um link por prefetch não pode produzir visualização.
4. Clicar em oferta e comunidade de teste autorizadas, conferir seus IDs no painel, mudar o período e verificar a virada do dia às 00h de São Paulo. Confirmar bloqueio do painel para visitante sem permissão.

Migração aditiva: `20260923180000_metricas`. Inclui índices por data nas tabelas de cliques já existentes. Eventos de busca/produto começam após a instalação; não há backfill fictício.

Testes: `node --import tsx --test lib/metrics/metrics.test.ts` (token, adulteração, ingestão, limite do corpo, falha de persistência, normalização, períodos, dias vazios e HEAD/prefetch).

Validação integrada e aplicação de migrações pendentes enquanto o Docker/PostgreSQL local estiver parado. A deduplicação de banco e as agregações SQL devem ser exercitadas com dados de teste nesse ambiente antes de implantação.
