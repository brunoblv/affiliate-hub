# Implementação — Preparação AdSense (meunovolar.com)

**Objetivo:** eliminar duplicação/thin content entre posts de blog e páginas de produto, e fechar os itens técnicos restantes (noindex, ads.txt, contato, disclosure de anúncios) antes de submeter o site ao AdSense.

**Stack assumida:** Next.js (confirmado pelos headers `_next/image`). Assumo que posts e produtos vêm de uma mesma coleção de conteúdo (CMS headless ou tabela no banco) com um campo que diferencia tipo de item — ajuste os nomes de model/campo abaixo para o que existir de fato no projeto.

---

## 1. Separar produto de post editorial (prioridade máxima)

**Problema:** `/blog/[slug]` e `/produtos/[slug]` estão renderizando o mesmo conteúdo raso (foto + preço + botão) para o mesmo item. Isso é duplicação interna + thin content — o principal motivo de reprovação.

**Decisão de arquitetura:** cada produto deve ter **uma única URL canônica** (`/produtos/[slug]`). O blog só publica algo quando existe texto editorial de verdade. Um produto sem texto editorial **não gera post**.

Trade-off: dá mais trabalho manter duas rotas com regras diferentes do que só continuar duplicando — mas é o único jeito de o Google (e o revisor humano do AdSense) parar de ver o site como catálogo raso disfarçado de blog.

### Tarefas
- [ ] Adicionar campo `hasEditorialContent: boolean` (ou equivalente) ao model de produto/post.
- [ ] Em `/blog`, no `getStaticProps`/query de listagem, filtrar **apenas** itens com `hasEditorialContent = true` (mesmo critério que já filtra a página `/blog` hoje — replicar esse filtro na home).
- [ ] Corrigir a seção "Conteúdos recentes" da home (`app/page.tsx` ou equivalente) para usar a mesma query filtrada — hoje ela puxa qualquer coisa da coleção, incluindo os stubs.
- [ ] Para os posts-stub já publicados: **redirect 301** de `/blog/[slug]` para `/produtos/[slug]` correspondente (evita 404 e preserva qualquer link/autoridade já indexado).
- [ ] Adicionar `robots: noindex` (via `<meta>` ou `generateMetadata`) nas páginas `/produtos/*` que ainda não tiverem texto editorial — elas continuam existindo para o afiliado, mas saem da amostragem de indexação até ganharem conteúdo (ver item 2).

---

## 2. Gerar descrição de produto com Gemini

Faz sentido — resolve o "thin" sem exigir que você escreva 200+ descrições na mão. Mas dois cuidados, porque texto gerado em massa e genérico é exatamente o padrão que o Google Helpful Content também penaliza:

1. **Ancorar no produto real**, não gerar texto genérico de enchimento. O prompt precisa receber atributos concretos (material, dimensões, o que resolve, para quem serve) — não só o título.
2. **Revisão leve antes de publicar**, pelo menos nos primeiros lotes, para pegar alucinação (Gemini inventando característica que o produto não tem é risco de reclamação/procon, não só SEO).

### Arquitetura sugerida

```
scripts/generate-product-copy.ts
  → lê produtos com hasEditorialContent = false
  → monta prompt com: título, categoria, preço, atributos conhecidos (se houver),
    e instrução explícita de NÃO inventar especificações não fornecidas
  → chama Gemini API
  → salva em campo `editorialBody` (rascunho) + `reviewStatus: 'pending'`
  → NÃO seta hasEditorialContent = true automaticamente
```

- [ ] Criar campo `editorialBody: string` (markdown/rich text) e `reviewStatus: 'pending' | 'approved'` no model.
- [ ] Script/rota interna (`scripts/generate-product-copy.ts`) que roda em lote, não em tempo real de request — gerar sob demanda no build é caro e lento.
- [ ] Prompt fixo versionado no repo (ex: `prompts/product-description.md`), cobrindo:
  - contexto do que o site é (conteúdo de casa/lar, tom direto)
  - dados de entrada permitidos (nunca extrapolar spec técnica)
  - estrutura de saída: 2-4 parágrafos — o que é, para que serve, para quem faz sentido, um ponto de atenção honesto (não é só elogio)
  - proibição explícita de claims de saúde/segurança não verificáveis
- [ ] Fila de aprovação simples: uma rota admin (ou até uma planilha exportada) para você bater o olho e mudar `reviewStatus` para `approved` — só então `hasEditorialContent` vira `true` e o item entra no filtro do blog/home (item 1).
- [ ] Rodar em lotes pequenos (10-20 por vez) e publicar aos poucos — publicação em massa no mesmo dia é outro sinal que pesa contra em revisão manual.

**Custo/rate limit:** Gemini API tem custo por token — para ~20-30 produtos iniciais é irrelevante, mas vale já criar o script pensando em rodar recorrente (novos produtos entrando toda semana) sem estourar cota.

---

## 3. Mais conteúdo editorial "de verdade"

O post sobre apartamento na planta é o padrão a replicar — não depende de produto, é peça de autoridade.

- [ ] Pauta de 15-20 artigos evergreen (organização, manutenção da casa, comparativos de categoria) que deem contexto natural para os produtos que já são promovidos, sem depender de gerar em cima de um único item.
- [ ] Meta prática: chegar a ~20-30 páginas de conteúdo substancial antes de submeter ao AdSense.

---

## 4. Itens técnicos rápidos

- [ ] **`/ads.txt`** — criar em `public/ads.txt` na raiz do projeto Next.js (fica acessível direto, sem rota). Conteúdo definitivo só depois de ter o Publisher ID do AdSense — deixar o arquivo pronto pra receber a linha assim que a conta existir.
- [ ] **Política de Privacidade** — adicionar seção específica sobre cookies de publicidade de terceiros (Google AdSense/DoubleClick) quando os anúncios entrarem no ar. Hoje só cobre analytics e afiliados.
- [ ] **Contato** — adicionar e-mail direto além do Instagram (ex: `contato@meunovolar.com`), mesmo que caia na mesma caixa que você já usa.
- [ ] **Search Console** — confirmar páginas indexadas de fato e algum volume de tráfego orgânico antes de submeter (não é requisito formal, mas reduz risco de reprovação por site "muito novo/sem tração").

---

## Ordem de execução recomendada

1. Item 1 (separar produto/post + corrigir feed da home) — **bloqueante**, faz o site parar de mostrar duplicação imediatamente.
2. Item 2 (pipeline Gemini) — roda em paralelo, mas nada publica até passar pela revisão.
3. Item 3 (pauta editorial) — contínuo, não bloqueia submissão se já houver volume mínimo.
4. Item 4 — pode ser feito em qualquer momento, mas fechar antes de submeter.
