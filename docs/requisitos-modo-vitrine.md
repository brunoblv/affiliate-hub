# Modo Vitrine — Requisitos de Implementação

> Novo modo de operação do **Affiliate Hub**, coexistindo com o modo atual (**Normal**), sem substituí-lo.

## 1. Contexto e objetivo

Hoje o sistema opera em um único modo de funcionamento (renomeado aqui como **Modo Normal**): cadastro de produto → busca de dados via API do canal → enfileiramento → postagem individual em grupos/páginas nos horários programados.

O **Modo Vitrine** adiciona uma camada nova, sem alterar esse fluxo: todo dia, o sistema seleciona um recorte curado dos produtos cadastrados e gera automaticamente uma **landing page diária** com os destaques e promoções do dia, usando a API do Gemini para os textos. Essa landing passa a ser o "produto principal" a ser divulgado nesse modo — os grupos recebem um post apontando para a landing, em vez de (ou além de) posts individuais por produto.

## 2. Modos do sistema

| Modo | Comportamento | Escopo do toggle |
|---|---|---|
| **Normal** (atual) | Fluxo existente: cada produto cadastrado é postado individualmente conforme a fila | Sem alteração |
| **Vitrine** (novo) | Gera 1 landing page/dia por projeto, com curadoria de produtos e textos via Gemini; grupos recebem post(s) direcionando à landing | Habilitável por projeto (ex: ativar só em "Achadinhos", manter "Meu Novo Lar" no Normal) |

**Decisão de design**: o toggle deve ser por projeto, não global. Cada projeto (Meu Novo Lar, ChartFM, Umbanda, Achadinhos) tem dinâmica de produto diferente — nem todos fazem sentido em formato de landing diária (ex: ChartFM não é um projeto de afiliados). Um projeto também pode, futuramente, rodar os dois modos em paralelo (landing diária + posts avulsos pontuais), então o campo deve ser um enum, não um booleano exclusivo.

## 3. Modelo de dados (Prisma)

Novas tabelas, sem alterar o schema existente de produtos/canais:

```prisma
enum ProjectMode {
  NORMAL
  VITRINE
}

model Project {
  // campos existentes...
  mode ProjectMode @default(NORMAL)
}

enum PriceTier {
  ACESSIVEL      // ex: <= R$ 50 (configurável por projeto)
  INTERMEDIARIO  // ex: R$ 50–150
  PREMIUM        // ex: > R$ 150
}

enum LandingBadge {
  MAIOR_DESCONTO
  MAIS_VENDIDO
  ACHADINHO_DO_DIA
  ULTIMAS_UNIDADES
}

model DailyLanding {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  date            DateTime @unique // uma landing por dia por projeto (chave composta com projectId)
  slug            String   @unique // ex: achadinhos-2026-08-31
  heroProductId   String?
  metaTitle       String
  metaDescription String
  status          String   // DRAFT | PUBLISHED | FAILED
  generatedAt     DateTime @default(now())
  items           LandingProduct[]
}

model LandingProduct {
  id               String       @id @default(cuid())
  dailyLandingId   String
  dailyLanding     DailyLanding @relation(fields: [dailyLandingId], references: [id])
  productId        String
  position         Int
  priceTier        PriceTier
  badge            LandingBadge?
  geminiHeadline   String?      // título curto gerado
  geminiDescription String?     // texto com gatilho emocional gerado
}
```

## 4. Curadoria diária (regras de seleção)

Job diário (novo, separado do worker de postagem atual) seleciona os produtos do dia com estas regras:

1. **Filtro de elegibilidade**: produto com desconto mínimo configurável (ex: ≥ 20%) OU marcado manualmente como destaque.
2. **Cota obrigatória por faixa de preço** — requisito explícito do Bruno: garantir produtos acessíveis todo dia.
   - Mínimo de **40% dos itens da landing** na faixa `ACESSIVEL`.
   - Restante distribuído entre `INTERMEDIARIO` e `PREMIUM`, sem cota mínima fixa.
   - *Motivo*: produto de entrada barato reduz a barreira de clique e sustenta a landing como "tem sempre algo pra mim", mesmo que a margem de afiliado seja menor — o produto acessível funciona como isca de tráfego, o ticket mais alto sustenta a receita.
3. **Diversidade de categoria**: evitar landing com 5 produtos da mesma categoria; limitar a N por categoria (configurável).
4. **1 produto "hero"**: o de maior desconto relativo ou maior potencial de conversão (histórico de cliques, se houver), vira o destaque principal da landing (topo, banner maior).
5. Quantidade total de itens por landing: configurável por projeto (sugestão inicial: 12–20 produtos).

## 5. Geração de texto via Gemini

Um serviço novo (`geminiContentService`) responsável por:

- **Headline da landing do dia** (ex: "Achadinhos de Segunda: até 70% off em casa e tecnologia").
- **Meta title / meta description** para SEO.
- **Texto por produto**: título curto + descrição de 1–2 linhas usando gatilho emocional por categoria (dor/necessidade, não característica técnica) — reaproveitando a lógica discutida (escassez, alívio de dor, prova social).
- **Badge textual** quando aplicável ("últimas unidades", "mais vendido do dia").

Pontos técnicos a prever:
- **Prompt versionado**: manter o prompt-base em arquivo/config, não hardcoded, para poder ajustar tom sem deploy.
- **Rate limit e custo**: uma landing com 15 produtos gera ~16-18 chamadas (headline geral + por item). Avaliar batelar em uma única chamada estruturada (JSON de saída) em vez de uma chamada por produto, para reduzir custo e latência.
- **Fallback obrigatório**: se a API do Gemini falhar ou retornar erro, o job não pode travar — usar template estático de fallback (ex: "R$ X por R$ Y — Y% OFF") e marcar a landing como `PUBLISHED` mesmo assim, sem depender do texto gerado para publicar.
- **Validação de saída**: sanitizar o texto gerado (tamanho máximo, remoção de markdown/aspas indesejadas) antes de salvar.

## 6. Estrutura ideal da landing page (front-end)

Página gerada estaticamente por dia (Next.js — ISR ou geração via build/cron), pensada para SEO + conversão:

1. **Hero** — produto destaque do dia, imagem grande, preço riscado + preço final, badge de desconto, CTA principal "Ver oferta" (link de afiliado) e CTA secundário "Entrar no grupo de ofertas" (WhatsApp/Telegram).
2. **Seção "Achadinhos até R$ 50"** — grid com os produtos `ACESSIVEL` do dia. Essa seção deve aparecer sempre, logo após o hero, justamente por ser a faixa de maior apelo de clique.
3. **Seção "Ofertas do dia"** — restante dos produtos (`INTERMEDIARIO`/`PREMIUM`), em grid por categoria.
4. **Barra fixa ou banner intermediário** de CTA para os grupos (repetir o convite no meio do scroll, não só no topo).
5. **Rodapé com histórico**: link para landings de dias anteriores (arquivo diário) — bom para SEO de cauda longa e permite a página ranquear por "ofertas [categoria] [data]".
6. **Meta tags e schema.org `Product`/`ItemList`** gerados a partir dos campos `metaTitle`/`metaDescription` e dos produtos da landing, para rich snippets no Google.

## 7. Integração com o fluxo de postagem existente

- Não remove o worker atual do Modo Normal.
- Novo job BullMQ (`generate-daily-landing`, cron diário, ex: 06h) que: seleciona produtos → chama Gemini → grava `DailyLanding` + `LandingProduct` → dispara build/revalidate da página.
- Após publicar a landing, enfileira automaticamente **1 post de divulgação** (não um post por produto) nos grupos do projeto em Modo Vitrine, com link para a landing — respeitando o mesmo scheduler de horários por canal já existente.
- Projetos em Modo Normal continuam recebendo posts individuais normalmente, sem nenhuma mudança de comportamento.

## 8. Requisitos não funcionais

- **Idempotência**: se o job rodar duas vezes no mesmo dia, não deve gerar landing duplicada (chave única `projectId + date`).
- **Observabilidade**: log de sucesso/falha do job diário, e alerta se a geração falhar (ex: Slack/e-mail), já que é um processo não supervisionado.
- **Analytics**: registrar clique por produto dentro da landing (UTM por item) para retroalimentar a curadoria (ex: priorizar categorias com mais clique histórico).
- **Configuração por projeto**: limites de faixa de preço, cota de acessíveis, quantidade de itens e categorias por landing devem ser configuráveis, não fixos no código.

## 9. Fases sugeridas de implementação

1. **Fase 1 (MVP)**: modelo de dados + job de curadoria com regra de cota de preço + geração de landing simples (sem Gemini, texto template) + página estática.
2. **Fase 2**: integração com Gemini para headline/descrições + fallback.
3. **Fase 3**: post automático de divulgação nos grupos + analytics de clique por produto.
4. **Fase 4**: ajuste fino de curadoria com base em dados de clique (priorização por performance histórica).
