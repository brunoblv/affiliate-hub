import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { ErrorBanner, Panel, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { acceptMatch, rejectMatches } from "@/lib/admin/match-actions";
import { money } from "@/lib/format";
import { asText, buildHref, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Correspondências · Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;
const scoreTone = (score: number) => (score >= 75 ? "good" : score >= 55 ? "warn" : "neutral");

export default async function MatchesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(asText(params.pagina), 10) || 1);

  // Produtos com sugestão pendente, os de melhor candidato primeiro.
  const groups = await prisma.matchSuggestion.groupBy({
    by: ["productId"],
    where: { status: "PENDING" },
    _max: { score: true },
    orderBy: { _max: { score: "desc" } },
  });
  const pageGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ids = pageGroups.map((g) => g.productId);

  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          variants: { include: { offers: { include: { store: true } } } },
          matchSuggestions: { where: { status: "PENDING" }, orderBy: { score: "desc" } },
        },
      })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  const [autoCount] = await Promise.all([prisma.matchSuggestion.count({ where: { status: "AUTO" } })]);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const self = buildHref("/admin/correspondencias", { pagina: String(page) });
  const notice = asText(params.aviso);

  return (
    <AdminShell active="Correspondências">
      <h1 className="text-2xl font-bold tracking-[-0.025em]">Correspondências no Mercado Livre</h1>
      <p className="mb-5 mt-1 text-[13px] text-muted">
        {groups.length} produto{groups.length === 1 ? "" : "s"} aguardando sua escolha · {autoCount} vinculado
        {autoCount === 1 ? "" : "s"} automaticamente (marca e modelo iguais).
      </p>
      {notice ? (
        <p role="status" className="mb-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
          {notice}
        </p>
      ) : null}
      <ErrorBanner message={asText(params.erro)} />

      {ordered.length === 0 ? (
        <Panel title="Nada para escolher">
          <p className="text-[13px] text-muted">
            Nenhum produto com sugestão pendente. As buscas rodam ao importar da Shopee ou com{" "}
            <code className="font-mono text-xs">npx tsx scripts/match-ml.ts</code>.
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {ordered.map((product) => {
            const source = product.variants.flatMap((v) => v.offers).find((o) => o.store.connector === "shopee");
            return (
              <Panel key={product.id} title={product.name.slice(0, 90)}>
                <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div className="flex gap-3 lg:flex-col">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.images[0]?.url ?? ""}
                      alt=""
                      width={96}
                      height={96}
                      loading="lazy"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <div className="text-xs text-muted">
                      <p className="font-semibold text-ink">Shopee</p>
                      <p>{source?.priceCents ? money(source.priceCents) : "sem preço"}</p>
                      <Link href={`/admin/produtos/${product.id}?aba=ofertas`} className="underline hover:text-brand">
                        abrir produto
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {product.matchSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="grid gap-3 rounded-[10px] border border-line p-3 sm:grid-cols-[72px_1fr_auto]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={suggestion.imageUrl ?? ""}
                          alt=""
                          width={72}
                          height={72}
                          loading="lazy"
                          className="h-[72px] w-[72px] rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[13px] font-semibold">{suggestion.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {suggestion.priceCents ? money(suggestion.priceCents) : "sem preço"} ·{" "}
                            {suggestion.reasons.join(" · ") || "título parecido"} ·{" "}
                            <a
                              href={`https://www.mercadolivre.com.br/p/${suggestion.catalogId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-brand"
                            >
                              ver no ML
                            </a>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusPill label={`nota ${suggestion.score}`} tone={scoreTone(suggestion.score)} />
                          <form action={acceptMatch} className="flex gap-2">
                            <input type="hidden" name="id" value={suggestion.id} />
                            <input type="hidden" name="voltar" value={self} />
                            <input
                              name="affiliateUrl"
                              type="url"
                              placeholder="link meli.la (opcional)"
                              className={`${inputClass} h-8 w-[190px] font-mono text-xs`}
                            />
                            <button type="submit" className={primaryButton + " !h-8 !px-3 !text-xs"}>
                              É este
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                    <form action={rejectMatches}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="voltar" value={self} />
                      <button type="submit" className={secondaryButton}>
                        Nenhum serve
                      </button>
                    </form>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between text-xs text-muted">
          <span>
            Página {page} de {totalPages} · {PAGE_SIZE} por página
          </span>
          <span className="flex gap-2">
            {page > 1 ? (
              <Link href={buildHref("/admin/correspondencias", { pagina: String(page - 1) })} className={`${secondaryButton} inline-flex items-center`}>
                ← Anterior
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={buildHref("/admin/correspondencias", { pagina: String(page + 1) })} className={`${secondaryButton} inline-flex items-center`}>
                Próxima →
              </Link>
            ) : null}
          </span>
        </div>
      ) : null}
    </AdminShell>
  );
}
