repo: brunoblv/affiliate-hub
branch: main
path: (whole repo)

## Last sync
date: 2026-09-02T01:05:42Z

### Updated in this project
- Read admin UI (sidebar/nav-items, shadcn button/card/badge) and public /blog page to ground the new visual plan in real structure.
- Planned warm editorial palette (creme/terracota/sálvia/oliva) over the current neutral shadcn theme, per user's brief.
- Built `Meu Novo Lar - Visual.dc.html`: admin dashboard mockup + public Home/Blog/Ferramentas mockups.
- Read `lib/agenda/enfileirar.ts`, `lib/vitrine/enfileirar.ts`, `lib/publicacao/publicadores.ts`, `prisma/schema.prisma` to design an art-composition pipeline (background + product photo/price/selo) plugged into the existing `Publicacao.imagemUrl` step.
- Built `Fundos Templates Arte.dc.html`: background templates by Post tipo (PRODUTO, LISTA, jornada) and LandingDiaria oferta, with reserved zones for dynamic content.

## Screen map
| Screen (this project) | Repo files |
|---|---|
| Sistema (admin) mockup | app/admin/layout.tsx, components/admin/app-sidebar.tsx, components/admin/nav-items.ts, components/ui/card.tsx, components/ui/button.tsx, components/ui/badge.tsx, app/globals.css |
| Site público — Home/Blog/Ferramentas mockup | app/blog/page.tsx, app/page.tsx, app/globals.css |
| Fundos por tipo de post (TemplateArte) | prisma/schema.prisma (Post.tipo, LandingDiaria), lib/agenda/enfileirar.ts, lib/vitrine/enfileirar.ts |
