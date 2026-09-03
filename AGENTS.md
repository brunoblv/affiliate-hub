<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

- Sempre rodar `npx tsc --noEmit -p tsconfig.json` (typecheck) antes de considerar qualquer mudança de código concluída — inclusive depois de alterar `prisma/schema.prisma` (rodar `npx prisma generate` primeiro, já que `lib/generated/prisma` é gitignored e não é regenerado automaticamente no build).
- Nunca divulgar/exportar um link sem ser o link de afiliado real (rastreado via `/go/:shortCode` ou `ProductSource.affiliateUrl`/`AffiliateLink.affiliateUrl`) — isso vale pra **todo tipo de post/CTA**: site público, Facebook, Telegram, WhatsApp, blog, Pinterest, etc. Nunca usar como fallback a URL crua da loja (`Product.productUrl`, `ProductSource.externalUrl`): se não existir link de afiliado cadastrado ainda, o certo é não mostrar/exportar nada (CTA desabilitado, produto pulado do export) em vez de vazar um link sem comissão — divulgar sem comissão contraria o próprio objetivo do sistema.
- Catálogo público do Meu Novo Lar (home, `/produtos`, `/ofertas`, vitrine) só aceita nicho casa/lar (`HOME_CATEGORIAS` + `ehForaDoTemaCasa` em `lib/nicho.ts`). Item fora do nicho não entra no site, não é importado e não é exportado — ver projeto AdSense em `CLAUDE.md`.
