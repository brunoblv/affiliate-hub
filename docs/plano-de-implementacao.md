# Affiliate Hub — plano de implementação por fases

Base: `Requisitos/Affiliate-Hub-Requisitos.md` (RF-xx). Atualizado em 2026-09-23.

Regra transversal: nada de número, produto ou selo inventado na interface. Sem dado, mostrar estado vazio. Nunca divulgar URL crua de loja: só o link de afiliado (`/go/[código]`).

## Onde estamos

| Fase | Assunto | Estado |
|---|---|---|
| 0 | Fundação: login Google, banco, sem dados de exemplo | **Concluída** |
| 1 | Modelo de dados e cadastro manual (admin) | **Concluída** (falta validação manual no navegador) |
| 2 | Site público lendo do banco, busca, comparação, `/go` | **Concluída** |
| 3 | Conta do usuário: favoritos e alertas | **Concluída** |
| 4 | Coleta de preços (Shopee), worker, painel, aviso por e-mail | **Concluída** (falta 2ª loja e worker em produção) |
| 5 | Conteúdo com Gemini, imagens e capas | **Concluída** |
| 6 | Comunidades, distribuição, métricas, implantação | **Em andamento:** 6a, 6b inicial (Telegram) e 6c implementadas; migrações/validação integrada pendentes; próximo bloco: 6d |

Como rodar localmente: `npm run dev` (site), `npm run worker` (coleta, alertas, fotos, capas; ou `npm run sync:once` para uma passada). Banco: container `affiliate-hub-postgres` (porta 5434, política de restart; se o banco não responder, o Docker Desktop provavelmente está fechado). Migrations: `prisma/migrations`, aplicadas com `npx prisma migrate deploy`.

---

## Etapas concluídas

### Fase 0 — Fundação
- Login Google (Auth.js), sessão JWT, `/admin` restrito por `ADMIN_EMAILS`, `/conta` exige login.
- Prisma 7 + Postgres dedicado, separado do meu-novo-lar.
- Dados de exemplo removidos; regras de elegibilidade e resumo de preço mantidas.

### Fase 1 — Modelo de dados e cadastro manual
- Schema: nichos, categorias em árvore, lojas, produtos, variações (com a padrão), ofertas, links de afiliado, imagens, histórico de preço. Preço em centavos inteiros.
- Admin: Lojas, Nichos e categorias, Produtos (lista, filtros, status) e editor com abas Dados, Variações, Ofertas, Imagens, Conteúdo e Criativos.
- Regras: oferta única por loja + anúncio + variação; alterar o preço de uma oferta não toca as demais nem o histórico delas; toda ação do admin revalida a permissão no servidor.
- **Fora desta entrega:** importar produto por URL, unir/desmembrar produtos, `Vendedor` como tabela própria (hoje é texto na oferta), vários links de campanha por oferta na tela (o schema já comporta).

### Fase 2 — Site público lendo do banco
- Repositório de catálogo (`lib/catalog.ts`) e regras de comparação (`lib/pricing.ts`). Só produto publicado, só oferta com preço e link de afiliado ativo; oferta sem estoque, com erro ou vencida não disputa o menor preço.
- Home, nicho, busca (sem acento, filtros, paginação), produto (variações por URL, comparação por variação, histórico em degraus da oferta mais barata), `/ofertas` com 4 recortes reais.
- `/go/[código]`: redireciona só ao link de afiliado, registra o clique sem atrasar a resposta; link desativado volta para a comparação.
- `sitemap.xml` e `robots.txt`; produto sem oferta atual sai com `noindex`.

### Fase 3 — Conta do usuário
- Favoritar (guarda o preço do momento) e alerta de preço na página do produto, com login sob demanda.
- `/conta`: favoritos, alertas (editar meta, remover), estado do alerta, excluir conta com cascata.
- Isolamento entre usuários e proteção contra redirecionamento externo verificados.

### Fase 4 — Coleta e atualização de preços
- Contrato de conectores (`lib/connectors`) e conector **Shopee** (API de afiliados): preço, link de afiliado e foto, com validação real na API.
- **Worker** separado do site, fila persistente em Postgres (reserva atômica, lease, retentativa com espera crescente, sem duplicar jobs nem observações), ciclo diário a partir das 03h (São Paulo).
- Preço nunca vira zero em falha: envelhece até deixar de valer; 3 falhas seguidas marcam erro. Variação acima de 40% vai para **revisão** (aprovar ou manter o antigo).
- `/admin/precos` real: worker ativo/parado, métricas do ciclo, lojas, revisões, ofertas com problema, coletas recentes, reprocessar por loja ou oferta.
- **Aviso dos alertas por e-mail** (SMTP genérico): um aviso por queda, rearma quando o preço volta a subir, sem envio duplicado entre workers.

### Fase 5 — Conteúdo, imagens e capas
- **Conteúdo (Gemini):** só usa fontes cadastradas (material do fabricante e especificações); sem fonte, recusa. Verificação automática bloqueia preço, popularidade inventada, teste inventado e certificação sem fonte. Fluxo gerar → revisar → publicar; edição manual protege a seção; regenerar uma seção; modelo e tokens registrados.
- **Imagens:** URL precisa devolver uma imagem; endereços internos bloqueados (SSRF); foto quebrada some do site; galeria por variação; reordenar e vincular a variação.
- **Capas:** 4 formatos (1200×630, 1080×1350, 1080×1920, 1080×1080) com a foto real; preço só se escolhido, datado e com "confirme na loja"; capa com preço perde a validade quando o menor preço muda; aprovação; arquivo servido só ao admin.

---

## Cobertura dos critérios de aceite (seção 14 dos requisitos)

| # | Critério | Situação |
|---|---|---|
| 1 | Produto com 4 ofertas, 2 da mesma loja, aparece uma vez | Atendido |
| 2 | Variações comparadas separadamente | Atendido (30 ml/60 ml/kit por variação) |
| 3 | Alterar preço de uma oferta não afeta as outras | Atendido |
| 4 | Dois links de campanha do mesmo anúncio sem duplicar | **Parcial:** schema pronto, falta a tela |
| 5 | Busca com/sem acento e filtro por nicho sem duplicar | Atendido |
| 6 | Criar nicho, categorias e **canais** pelo admin | Implementado; validação manual do fluxo de comunidades pendente |
| 7 | Importar categorias externas sem correspondência para revisão | **Pendente** |
| 8 | Ciclo diário; reiniciar worker sem duplicar | Atendido |
| 9 | Falha de API, HTML alterado, cookie expirado | **Parcial:** API atendida; HTML e cookie dependem do coletor web |
| 10 | Oferta vencida/indisponível não define o menor preço | Atendido |
| 11 | Gemini sem popularidade inventada, sem preço, sem sobrescrever edição | Atendido |
| 12 | Capas em todos os formatos; preço novo invalida | Atendido |
| 13 | Cada botão usa seu link e registra a oferta certa | Atendido |
| 14 | Grupos/canais por nicho; clique medido | Implementado na Fase 6a; validação integrada pendente |
| 15 | Migração preserva códigos, históricos e relações | **Pendente (Fase 6)** |
| 16 | Fluxo completo no celular | **Pendente:** layout responsivo existe, falta validar em aparelho |
| 17 | meunovolar.com só com conteúdo editorial de casa | **Pendente (Fase 6, no repositório do blog)** |
| 18 | Jobs do Hub não criam nada no Meu Novo Lar | Atendido por construção (repositórios e bancos separados) |
| 19 | Repositórios e implantações independentes | **Parcial:** código independente; falta pipeline e implantação |
| 20 | URLs comerciais antigas com destino individual | **Pendente (Fase 6)** |

---

## Próximas etapas

### Fase 6 — Comunidades, distribuição, métricas e implantação

**6a. Comunidades (RF-05)**
- Implementada em 22/09: `/admin/comunidades` cadastra/edita os quatro tipos, permite vários destinos por nicho, ordem e desativação. Identificador de publicação opcional; nenhuma postagem é disparada pelo cadastro.
- `/comunidades` lista destinos ativos; páginas de nicho e produto mostram convites contextuais (todos os nichos associados ao produto). Nicho inativo também oculta seus convites.
- `/comunidades/entrar/[id]` valida o destino, redireciona sem cache e registra clique com nicho e origem local, sem IP ou identificação de usuário. Convite indisponível retorna à listagem com aviso. Contagens no admin são cliques, nunca adesões.
- Migração aditiva: `20260922120000_comunidades`. Aplicar com `npx prisma migrate deploy` antes de executar o código; regenerar o client com `npx prisma generate`. Destinos com histórico são desativados, sem exclusão.
- Testes permanentes: `node --import tsx --test lib/communities/validation.test.ts` cobre convites e rejeição de URLs inválidas (2 testes aprovados). `npx tsc --noEmit -p tsconfig.json` aprovado após regenerar o client.
- Validação local: Docker fora de execução e PostgreSQL `localhost:5434` sem conexão. Migração **não aplicada**. O build compilou e verificou tipos, mas falhou no prerender de `/admin` por `ECONNREFUSED`. Após iniciar o banco: aplicar migrações, repetir build e validar cadastro/edição/desativação e registro de clique em navegador autenticado. Não houve publicação ou implantação.
- Modelo de destinos por nicho: grupo/canal de WhatsApp e Telegram, com plataforma, tipo, nome, link público de entrada, status e vínculo ao nicho; mais de um destino do mesmo tipo por nicho.
- Admin em "Comunidades"; CTAs contextuais nas páginas de nicho e de produto (sem exigir entrada para comparar preços); clique de entrada medido por nicho e destino (clique não é adesão confirmada).

**6b. Distribuição**
- Entrega inicial em 23/09: `/admin/distribuicao` prepara prévia, aprova e agenda ofertas individuais para Telegram; escolha explícita de oferta/link, comunidade do nicho e capa aprovada opcional. Registro de tentativas e reconciliação manual de resultados incertos.
- Worker com fila persistente/reserva serializada, teto de 3 ofertas/dia por chat, intervalo de 1 hora e dedup por produto/título em 7 dias. Revalida preço, estoque, afiliação, destino e capa antes do envio. Timeout/interrupção não causam reenvio automático; 429 explícito respeita espera e limite de tentativas.
- Distribuição permanece **desabilitada por padrão**; nenhuma mensagem real enviada na implementação. WhatsApp/Facebook e configuração de limites por destino ainda pendentes. Facebook exige também mix semanal e link em comentário antes de habilitação.
- Migração aditiva `20260923120000_distribuicao`; Prisma Client regenerado. 14 testes locais (incluindo comunidades) e typecheck aprovados. Docker segue parado: migrações, concorrência no PostgreSQL e fluxo autenticado ainda não validados. Operação/configuração em [distribuicao.md](distribuicao.md).
- Publicação de ofertas nos destinos com horários, limites, prevenção de duplicação e histórico de falhas, seguindo `docs/hub/regras-postagem-facebook.md` e reaproveitando **código** (não imports) do meu-novo-lar.
- Uso das capas aprovadas; marcar a capa como **publicada** com o preço do momento; conferir a validade do preço antes de publicar.
- Vincular cada publicação a nicho, produto e oferta usada.

**6c. Métricas (RF-12)**
- Implementada em 23/09: eventos de busca/sem resultado e visualização de produto via página visível, com token assinado e deduplicação por ID. Sem cookies analíticos ou identificação de visitante; prefetch/HEAD não contam novos cliques.
- `/admin/metricas`: períodos de 7/30/90 dias, totais, taxa sem resultado, série diária e top 10 de termos/produtos/ofertas/comunidades, incluindo os cliques existentes. Sem alegar visitantes únicos, vendas, receita ou adesão.
- Migração aditiva `20260923180000_metricas`, client regenerado e testes em `lib/metrics/metrics.test.ts`. Banco local segue indisponível (Docker parado): aplicação das migrações, agregações SQL e fluxo no navegador pendentes. Definições e limites em [metricas.md](metricas.md).
- Buscas, buscas sem resultado, visualização de produto, clique por oferta, clique em comunidade; painel no admin.
- Comissão só quando houver confirmação/importação correspondente.

**6d. Implantação e separação dos projetos**
- Domínio e marca definitivos; `AUTH_URL`, `NEXT_PUBLIC_SITE_URL` e redirect URI do Google de produção; e-mail (SMTP) de produção.
- Site e **worker como serviços** (pm2, container ou similar), volume persistente para `CREATIVES_DIR`, fontes instaladas no servidor (para as capas), backup do banco, logs e alerta de worker parado.
- Pipeline (build, typecheck, migrations) e documentação de execução.
- Meu Novo Lar: retirar catálogo, ofertas e posts de produto; mapear e redirecionar individualmente URLs comerciais antigas para páginas equivalentes já publicadas no Hub (sem redirecionar tudo para a home).
- Migração dos produtos atuais para produto + variação + oferta + link, preservando códigos `/go`, históricos e cliques, com contagens reconciliadas.

**Pronto quando:** critérios 6, 14, 15, 17, 19 e 20 passam.

### Pendências que atravessam as fases

| Item | Origem | Observação |
|---|---|---|
| Testes automatizados no repositório | Todas | Suíte permanente de comunidades/distribuição/métricas adicionada (20 testes com Node/tsx, aprovados). Falta ampliar cobertura de catálogo/coleta e integrar ao pipeline. |
| Commit do código | Todas | Comunidades registradas em `b751839`; entregas 6b inicial e 6c estão no diretório de trabalho, sem novo commit. |
| Segunda loja com coletor web (RF-07) | Fase 4 | Exige estudo por loja (estrutura da página, sessão, variação). A base de conectores está pronta. |
| Importar produto por URL / por conector | Fase 1 | Criar o cadastro a partir da URL da Shopee (título, foto, categoria externa). |
| Importação e mapeamento de categorias externas (RF-04) | Fase 1/4 | Fila de classificação com sugestão da IA e revisão humana. |
| Unir e desmembrar produtos duplicados | Fase 1 | Registrar IDs anteriores e redirecionar páginas. |
| Vários links de campanha por oferta | Fase 1 | Tela; o schema já aceita vários. |
| Busca em SQL (`unaccent` + `pg_trgm`) | Fase 2 | Hoje filtra preço em memória sobre até 300 candidatos; migrar quando o catálogo crescer. |
| Estoque da Shopee | Fase 4 | A API não informa estoque; a disponibilidade fica como cadastrada. |
| Páginas institucionais do Hub | Nova | Política de privacidade, termos e contato (necessárias para o login com Google em produção e para a LGPD). |
| Validação em celular | Fase 2/3 | Percorrer buscar → produto → comparar → abrir loja em aparelho real. |
| Validação manual das telas do admin | Fase 1 | Só foram exercitadas por requisições automatizadas. |

---

## Decisões

| Decisão | Situação | Observação |
|---|---|---|
| Biblioteca de login | Decidida | Auth.js com Google |
| Banco | Decidida | Postgres dedicado, Prisma 7 |
| Loja prioritária | Decidida | Shopee |
| Fila | Decidida | Postgres (reavaliar com volume maior) |
| Canal dos alertas | Decidida | E-mail por SMTP; falta o servidor de e-mail real |
| Domínio e marca definitivos | **Em aberto** | Trava a Fase 6d e o Google OAuth de produção |
| Onde o Hub e o worker vão rodar | **Em aberto** | Trava a Fase 6d |
| Servidor de e-mail (Gmail com senha de app, Brevo, SES...) | **Em aberto** | Sem ele, o aviso do alerta não sai |
| Segunda loja e método de coleta | **Em aberto** | Depende do estudo por loja |
| Regra de associação anúncio → produto | **Em aberto** | Sugestão: sempre com revisão humana no início |
