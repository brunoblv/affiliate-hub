# Regras de postagem no Facebook (Meu Novo Lar)

> Implementado. Complementa o agendamento descrito em `especificacao-affiliate-hub-v2.md` §6 — não substitui, refina.
> `docs/hub/*.ts` é só o espelho da spec v2 antiga; o código real está em:
> - `lib/agenda/content-type.ts` — classificação `ContentType` (regra 3).
> - `lib/agenda/similaridade.ts` + `enfileirar.ts` (`produtoMuitoSimilarNoCanal`) — dedup por título (regra 2).
> - `lib/agenda/proximo-horario.ts` (`tetoOfertaIndividualDiario`) — teto diário de oferta_individual (regra 1).
> - `lib/agenda/mix-semanal.ts` — cálculo e alerta do mix semanal (regra 3).
> - `lib/publicacao/publicadores.ts` (`PublicadorFacebook`, campo `Canal.linkEmComentario`) — link em comentário (regra 4).
> - `lib/publicacao/insights.ts` — sincronização de Insights (regra 5).
> - `lib/relatorios/media-por-content-type.ts` e `relatorio-semanal-facebook.ts` — telemetria e relatório semanal (regras 5–6), rodando via `workers/index.ts`.
> - `prisma/schema.prisma` — `ContentType`, `Publicacao.contentType`, `Publicacao.{visualizacoes,visualizadoresUnicos,engajamentos,insightsSincronizadoEm}`, `Canal.{tetoOfertaIndividualDiario,linkEmComentario}`.

## Contexto

Página `web.facebook.com/meunovolarblog`, ligada a `meunovolar.com`, alimentada automaticamente pelo hub. Diagnóstico sobre o histórico real de posts (10/ago–05/set/2026):

- Página com 31 seguidores, postando com consistência só a partir de 01/set — na prática, página nova. Alcance orgânico baixo aqui é esperado, não é sintoma de post ruim.
- Maioria dos posts é `oferta_individual`, com 4+ variações quase idênticas no mesmo dia (ex.: 4 posts de "enchimento de almofada 45cm" em sequência em 03/set). Facebook tende a tratar esse padrão como spam e reduz distribuição.
- `oferta_individual` performa mal: tipicamente 0–8 visualizações, 0 engajamento.
- Os dois melhores posts da página **não** são oferta individual:
  - "Achados de hoje na Shopee — 03 de setembro" (lista/curadoria, link pro blog): 492 visualizações, 451 visualizadores.
  - "Jardim vertical" (conteúdo + produtos, não oferta isolada): 177 visualizações, 7 engajamentos — maior engajamento da página.
- Único post alinhado à bio ("meu primeiro apê, do jeito que eu sempre quis") — "O que você precisa saber antes de comprar um apartamento na planta" — não tem recorrência: aparece uma vez e some.
- Quase todo post carrega link externo (Shopee ou meunovolar.com) na legenda — fator conhecido de supressão de alcance orgânico.

**Fora de escopo:** crescimento de seguidores via ads/impulsionamento — frente separada, não é mudança de lógica de postagem.

## content_type

Todo item enfileirado para o Facebook precisa de um `content_type`:

| Tipo | Descrição |
|---|---|
| `oferta_individual` | Post de um produto só. |
| `selecao` | Lista/curadoria de vários produtos (ex.: "achados de hoje", vitrine). |
| `conteudo_blog` | Post linkando artigo do blog (guia, "como fazer"), sem foco em oferta. |
| `narrativa_pessoal` | Série "jornada do apê" (compra, reforma, decisões, antes/depois). |

## Regras

### 1. Limite de cadência por content_type

Máximo **2–3 posts de `oferta_individual` por dia por página** (configurável; hoje chega a 8). Sem teto rígido para `selecao`/`conteudo_blog`, mas priorizá-los no scheduler quando houver fila dos dois tipos no mesmo horário.

### 2. Deduplicação por similaridade de produto

Antes de enfileirar um `oferta_individual`: comparar o título normalizado do produto com os títulos postados no Facebook nos últimos 7 dias (similaridade de tokens/Jaccard ou embedding simples). Similaridade acima do limiar (ex.: 70%) → bloquear o enfileiramento ou empurrar para janela futura, com log do motivo. Evita o padrão de 4 variações do mesmo kit no mesmo dia.

### 3. Mix obrigatório de conteúdo (por semana)

- Pelo menos **1** post `narrativa_pessoal`/semana.
- Pelo menos **2–3** posts `selecao`/semana.
- Restante da cota pode ser `oferta_individual`, respeitando a regra 1.

Se não houver `narrativa_pessoal` ou `selecao` pronto na fila, **alertar** (log/notificação) em vez de preencher o espaço com mais `oferta_individual`.

### 4. Posicionamento do link de afiliado (teste A/B)

Suportar publicar **sem link na legenda**, com o link postado como primeiro comentário automático logo após a publicação. Flag por post/canal, para comparar alcance dos dois formatos (link na legenda vs. link em comentário) usando os dados de Insights já coletados.

Importante: o link publicado — seja na legenda seja no comentário — segue a regra geral do repo (`AGENTS.md`): nunca a URL crua da loja, sempre o link do blog (`/produtos/[slug]`) ou `/go/:codigo` conforme o canal.

### 5. Telemetria por content_type

Persistir `content_type` junto com o post/`Publicacao` no banco e relacionar com métricas de Insights (visualizações, visualizadores, engajamento, impressões) quando disponíveis via API/export. Objetivo: consulta tipo "média de visualizações por content_type nos últimos 30 dias" sem análise manual.

### 6. Relatório semanal

Job semanal (reaproveitar a fila/worker existente) que resume por página/canal: quantos posts por `content_type` e média de visualizações/engajamento de cada tipo. Sinalizar se a proporção real de `oferta_individual` ficou acima do previsto na regra 3.

## Critérios de aceite

- [ ] Scheduler nunca enfileira mais de 2–3 `oferta_individual` por dia por página (configurável).
- [ ] Produto com título muito similar a outro postado no Facebook nos últimos 7 dias não é publicado sem intervenção manual.
- [ ] Todo post novo tem `content_type` registrado no banco.
- [ ] Dá pra gerar (mesmo que via query manual) a média de visualizações por `content_type` dos últimos 30 dias.
- [ ] Existe flag/config para publicar com o link em comentário em vez da legenda.
