# Alterações

Lista de alterações solicitadas. Marque `[x]` quando concluída.

## Pendentes

_Nenhuma._

## Concluídas

- [x] Produtos do AliExpress
  - Novo conector `lib/connectors/aliexpress.ts` (Affiliate API oficial: preço em BRL, preço anterior, loja, todas as fotos e link de afiliado). Configurar `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` e `ALIEXPRESS_TRACKING_ID` e cadastrar a loja em /admin/lojas com o conector "AliExpress".
  - Admin aceita o link do item (`/item/….html`) ou o link curto de afiliado (`s.click.aliexpress.com/e/…`), que vira o link de afiliado da oferta. A importação traz a galeria completa (até 10 fotos).
  - A API não entrega a descrição: o texto da landing page vem do "Material de referência" na aba de conteúdo (geração com Gemini), como nas outras lojas.
  - Produto de exemplo (Aiolia de Leão Myth Cloth EX): `npx tsx scripts/seed-aliexpress-example.ts [--nicho <slug>] [--categoria <slug>]`.

- [x] Apenas itens NOVOS serão cadastrados no site
  - Admin: removido o campo "Condição" do formulário de oferta; toda oferta manual é salva como `NEW` (`app/admin/produtos/[id]/page.tsx`, `lib/admin/actions.ts`).
  - Coletores automáticos (Mercado Livre, feed de descoberta) já ignoravam usados — sem mudança.
  - Página do produto: o seletor Novo/Usado só aparece se a variação ainda tiver alguma oferta usada antiga (`app/produto/[slug]/page.tsx`).
