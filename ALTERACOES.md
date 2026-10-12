# Alterações

Lista de alterações solicitadas. Marque `[x]` quando concluída.

## Pendentes

_Nenhuma._

## Concluídas

- [x] Descoberta automática de produtos e vitrines por loja (`docs/plano-descoberta-e-vitrines.md`, RF-16 e RF-17)
  - Migração `20261012120000_descoberta_vitrines` (aplicar com `npx prisma migrate deploy`) e depois `npm run discovery:seed` (marcas, termos bloqueados e pautas padrão 25 Shopee + 25 AliExpress).
  - Conectores Shopee e AliExpress implementam `searchCandidates`; candidatos e rodadas ficam no banco. Rodada diária no worker, só com `DISCOVERY_ENABLED=true`; `npm run discover` roda na hora. Produto nasce e **fica** em rascunho (`DISCOVERY_AUTOPUBLISH=false`): a publicação é em lote em `/admin/candidatos?status=importado`, com o motivo da pendência por produto.
  - Admin novo: `/admin/descoberta` (pautas e histórico de rodadas) e `/admin/marcas`; `/admin/correspondencias` ganha sugestões Shopee ↔ AliExpress (genérico sempre com confirmação humana). Mercado Livre fica como estava.
  - Antes de confiar nas pautas do AliExpress: `npm run aliexpress:verify -- --descoberta` mostra os campos que a API realmente devolve (a nota do AliExpress é % de positivas, por isso não vira estrela).
  - Vitrines públicas: `/loja`, `/loja/[slug]`, `/marcas`, `/achadinhos`, filtro "tipo" (marca/genérico) em `/busca` e `/ofertas`. Seleção do dia congelada em `ShowcaseEntry` e reconferida na renderização; vendas e nota sempre com fonte e data, e somem após 30 dias.
  - Textos da vitrine (frase e "sobre") se editam em `/admin/lojas`. `/loja/[slug]` só é indexada com 12+ produtos.

- [x] Produtos do AliExpress
  - Novo conector `lib/connectors/aliexpress.ts` (Affiliate API oficial: preço em BRL, preço anterior, loja, todas as fotos e link de afiliado). Configurar `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` e `ALIEXPRESS_TRACKING_ID` e cadastrar a loja em /admin/lojas com o conector "AliExpress".
  - Admin aceita o link do item (`/item/….html`) ou o link curto de afiliado (`s.click.aliexpress.com/e/…`), que vira o link de afiliado da oferta. A importação traz a galeria completa (até 10 fotos).
  - A API não entrega a descrição: o texto da landing page vem do "Material de referência" na aba de conteúdo (geração com Gemini), como nas outras lojas.
  - Produto de exemplo (Aiolia de Leão Myth Cloth EX): `npx tsx scripts/seed-aliexpress-example.ts [--nicho <slug>] [--categoria <slug>]`.

- [x] Apenas itens NOVOS serão cadastrados no site
  - Admin: removido o campo "Condição" do formulário de oferta; toda oferta manual é salva como `NEW` (`app/admin/produtos/[id]/page.tsx`, `lib/admin/actions.ts`).
  - Coletores automáticos (Mercado Livre, feed de descoberta) já ignoravam usados — sem mudança.
  - Página do produto: o seletor Novo/Usado só aparece se a variação ainda tiver alguma oferta usada antiga (`app/produto/[slug]/page.tsx`).
