@AGENTS.md

# Projeto: Adequação AdSense (meunovolar.com)

**Objetivo:** o site passar na revisão do AdSense como publicação de nicho *casa/lar*, não como agregador genérico. Blog e páginas institucionais já estão ok — o risco está no catálogo, nos 404 e na duplicação de ofertas.

**Nicho público:** ideias para o lar (organização, cozinha, banheiro, lavanderia, limpeza, decoração, iluminação, móveis, ferramentas, jardim, eletrodomésticos de casa). Fora: beleza/skincare, suplemento, eletrônico de consumo (celular, tablet, notebook, Smart TV), moda, pet, religião.

**Regra de ouro do catálogo:** se não for casa, não indexa, não lista, não exporta. Sem fallback para “mostrar mesmo assim”.

## Prioridade (ordem de execução)

1. **404 do Mercado Livre** — catálogo não pode linkar página inexistente. Slug legado `mercado_livre-mlb…` resolve por `idExterno` e redireciona 301 para o slug canônico, ou 404 se o item estiver fora do nicho/apagado.
2. **Purgar fora do nicho** — no admin: Produtos → **Purgar fora do nicho (AdSense)**. Ou no servidor: `npx tsx scripts/purgar-fora-do-nicho.ts`. Apaga produto + ficha `Post` tipo `PRODUTO` e junta duplicatas.
3. **Upsert, não página nova** — descoberta Shopee/ML atualiza preço/link da página existente (mesmo título canônico). Sufixos `-2`, `-3` são regressão.
4. **Vitrine** — `/vitrine` nunca mostra “ainda não foi gerada”. Se o job do dia falhar, exibe a última landing publicada.

## Tom da escrita (artigos, fichas, legendas)

- A adequação ao AdSense é estrutural — catálogo, indexação, 404, duplicação. Ela **nunca aparece no texto em si**. Não escrever frase nenhuma que explique ou defenda a natureza do site ("aqui não é um agregador", "somos especializados em casa, diferente de sites genéricos", "selecionamos com cuidado, não é uma lista qualquer"). Isso soa como o site se justificando sem ninguém ter perguntado — estranho pra quem lê. Se o conteúdo é bom e focado em casa, isso já fala por si; não precisa dizer.
- Sem jargão de marketing ("imperdível", "revolucionário", "prepare-se para se surpreender", "melhor do mercado", "não pode ficar de fora"). Escrever como alguém explicando pra um amigo, não como anúncio.

## Não mexer

- Artigos `JORNADA` do blog (profundidade + disclosure de afiliado).
- Sobre, Privacidade, Equipe editorial, Termos.
- `robots: noindex, follow` nas fichas `/produtos/[slug]` e posts `LISTA`/`PRODUTO`.

## Checklist antes de submeter

- [ ] Crawl de `/produtos` e `/ofertas`: zero 404, zero item fora do nicho, uma URL por produto (sem `-2`/`-3`).
- [ ] Um produto = uma URL (sem varal/secalux repetido com `-2`/`-3`).
- [ ] `/vitrine` mostra landing real, nunca estado vazio.
- [ ] `ads.txt` com Publisher ID quando a conta AdSense existir.
- [ ] Search Console: páginas indexadas = blog JORNADA + institucionais, não fichas de produto.

## Arquivos-chave

- `lib/nicho.ts` — termos proibidos no título.
- `lib/produtos.ts` — `HOME_CATEGORIAS` + `produtoVisivelNoSite`.
- `lib/catalogo.ts` — lookup canônico / slugs antigos ML.
- `scripts/purgar-fora-do-nicho.ts` — remoção no banco + consolidação de duplicatas.
- `docs/hub/implementacao-adsense-meunovolar.md` — auditoria anterior (itens 1–4 técnicos); este projeto cobre o que a revisão de 2026-09 acrescentou.
