import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { ErrorBanner, Field, Panel, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { importStoredCandidates, publishReady, rejectCandidates, flagWrongBrand } from "@/lib/admin/discovery-admin";
import { blockersForProducts } from "@/lib/discovery/publish-gate";
import { money } from "@/lib/format";
import { asText, buildHref, type RawParams } from "@/lib/query";
import { ManualSearch } from "./busca";

export const metadata: Metadata = {
  title: "Candidatos · Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 40;

const STATUS = [
  { value: "novo", label: "Novos", db: "NEW" },
  { value: "importado", label: "Importados (revisão)", db: "IMPORTED" },
  { value: "indisponivel", label: "Sem link / fora do ar", db: "UNAVAILABLE" },
  { value: "duplicado", label: "Duplicados", db: "DUPLICATE" },
  { value: "rejeitado", label: "Rejeitados", db: "REJECTED" },
] as const;

const SOURCES = [
  { value: "SHOPEE_API", label: "Shopee" },
  { value: "ALIEXPRESS_API", label: "AliExpress" },
] as const;

const TIERS = [
  { value: "BRANDED", label: "Marca" },
  { value: "GENERIC", label: "Genérico" },
  { value: "UNKNOWN", label: "Indefinido" },
] as const;

const scoreTone = (score: number) => (score >= 75 ? "good" : score >= 55 ? "warn" : "neutral");
const tierLabel = (tier: string) => TIERS.find((item) => item.value === tier)?.label ?? tier;
const sourceLabel = (source: string) => SOURCES.find((item) => item.value === source)?.label ?? source;
const ratingText = (centis: number | null) => (centis === null ? null : `nota ${(centis / 100).toFixed(1).replace(".", ",")}`);

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const view = asText(params.vista) === "busca" ? "busca" : "banco";
  const status = STATUS.find((item) => item.value === asText(params.status)) ?? STATUS[0];
  const source = SOURCES.find((item) => item.value === asText(params.fonte))?.value;
  const tier = TIERS.find((item) => item.value === asText(params.tier))?.value;
  const minScore = Math.max(0, Math.min(100, Number.parseInt(asText(params.nota), 10) || 0));
  const q = asText(params.q).trim();
  const page = Math.max(1, Number.parseInt(asText(params.pagina), 10) || 1);
  const notice = asText(params.aviso);

  const here = (overrides: RawParams) =>
    buildHref("/admin/candidatos", { vista: view, status: status.value, fonte: source, tier, nota: minScore ? String(minScore) : "", q, pagina: String(page), ...overrides });

  const tabs = (
    <nav aria-label="Visões" className="mb-5 flex gap-2.5">
      {[
        { value: "banco", label: "Candidatos da descoberta" },
        { value: "busca", label: "Busca manual (Shopee)" },
      ].map((tab) => (
        <Link
          key={tab.value}
          href={buildHref("/admin/candidatos", { vista: tab.value })}
          aria-current={tab.value === view ? "page" : undefined}
          className={`rounded-[9px] px-4 py-2.5 text-[13px] font-semibold ${
            tab.value === view ? "bg-brand text-surface" : "border border-line bg-surface text-ink hover:border-brand"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );

  if (view === "busca") {
    return (
      <AdminShell active="Candidatos">
        <h1 className="text-2xl font-bold tracking-[-0.025em]">Candidatos a produto</h1>
        <p className="mb-5 mt-1 text-[13px] text-muted">Busca ao vivo na Shopee: útil para testar uma pauta nova antes de cadastrá-la.</p>
        {notice ? (
          <p role="status" className="mb-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
            {notice}
          </p>
        ) : null}
        <ErrorBanner message={asText(params.erro)} />
        {tabs}
        <ManualSearch params={params} />
      </AdminShell>
    );
  }

  const where: Prisma.ProductCandidateWhereInput = {
    status: status.db,
    ...(source ? { source } : {}),
    ...(tier ? { tier } : {}),
    ...(minScore ? { score: { gte: minScore } } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const [total, rows, counts, niches] = await Promise.all([
    prisma.productCandidate.count({ where }),
    prisma.productCandidate.findMany({
      where,
      orderBy: [{ score: "desc" }, { lastSeenAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.productCandidate.groupBy({ by: ["status"], _count: true }),
    prisma.niche.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { categories: { orderBy: { name: "asc" } } } }),
  ]);
  const countOf = (db: string) => counts.find((row) => row.status === db)?._count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fila de revisão: só rascunhos, cada um com o motivo da pendência no portão (A.9).
  const review = status.value === "importado";
  const productIds = review ? rows.flatMap((row) => (row.productId ? [row.productId] : [])) : [];
  const [blockers, products] = await Promise.all([
    blockersForProducts(productIds),
    productIds.length
      ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, status: true, slug: true } })
      : Promise.resolve([]),
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const self = here({});

  return (
    <AdminShell active="Candidatos">
      <h1 className="text-2xl font-bold tracking-[-0.025em]">Candidatos a produto</h1>
      <p className="mb-5 mt-1 text-[13px] text-muted">
        Achados das rodadas de descoberta, com pontuação, marca e motivo de cada decisão. {total} neste filtro.
      </p>
      {notice ? (
        <p role="status" className="mb-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
          {notice}
        </p>
      ) : null}
      <ErrorBanner message={asText(params.erro)} />
      {tabs}

      <nav aria-label="Status" className="mb-4 flex flex-wrap gap-2">
        {STATUS.map((item) => (
          <Link
            key={item.value}
            href={here({ status: item.value, pagina: "1" })}
            aria-current={item.value === status.value ? "page" : undefined}
            className={`rounded-[9px] px-3 py-2 text-xs font-semibold ${
              item.value === status.value ? "bg-ink text-surface" : "border border-line bg-surface hover:border-brand"
            }`}
          >
            {item.label} · {countOf(item.db)}
          </Link>
        ))}
      </nav>

      <Panel title="Filtros">
        <form method="get" className="grid gap-3.5 sm:grid-cols-[1fr_150px_150px_110px_auto] sm:items-end">
          <input type="hidden" name="status" value={status.value} />
          <Field label="Título contém">
            <input name="q" defaultValue={q} className={inputClass} placeholder="fone, escorredor…" />
          </Field>
          <Field label="Fonte">
            <select name="fonte" defaultValue={source ?? ""} className={inputClass}>
              <option value="">Todas</option>
              {SOURCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marca / genérico">
            <select name="tier" defaultValue={tier ?? ""} className={inputClass}>
              <option value="">Todos</option>
              {TIERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nota mínima">
            <input name="nota" type="number" min={0} max={100} defaultValue={minScore || ""} className={inputClass} />
          </Field>
          <button type="submit" className={primaryButton}>
            Filtrar
          </button>
        </form>
      </Panel>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface px-6 py-10 text-center text-[13px] text-muted">
          Nada neste filtro. Cadastre pautas em <Link href="/admin/descoberta" className="underline hover:text-brand">Descoberta</Link> e
          rode uma rodada.
        </p>
      ) : (
        <form action={review ? publishReady : importStoredCandidates} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="voltar" value={self} />
          <Panel title={review ? "Fila de revisão" : "Candidatos"}>
            <ul className="flex flex-col divide-y divide-line">
              {rows.map((row) => {
                const productId = row.productId;
                const pending = productId ? blockers.get(productId) : undefined;
                const product = productId ? productById.get(productId) : undefined;
                const selectable = review ? Boolean(productId && product?.status === "DRAFT") : true;
                return (
                  <li key={row.id} className="grid grid-cols-[auto_56px_1fr_auto] items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      name="sel"
                      value={review ? (productId ?? "") : row.id}
                      disabled={!selectable}
                      aria-label={`Selecionar ${row.title}`}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.imageUrl ?? ""} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[13px] font-semibold">{row.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {sourceLabel(row.source)} · {row.sellerName ?? "vendedor não informado"} · {tierLabel(row.tier)}
                        {ratingText(row.ratingCentis) ? ` · ${ratingText(row.ratingCentis)}` : ""}
                        {row.salesCount !== null ? ` · ${row.salesCount} vendas` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{row.reasons.join(" · ")}</p>
                      {row.statusReason ? <p className="mt-0.5 text-xs text-warn-ink">{row.statusReason}</p> : null}
                      {review ? (
                        <p className="mt-1 text-xs">
                          {product?.status === "PUBLISHED" ? (
                            <span className="text-good">publicado</span>
                          ) : pending && pending.length > 0 ? (
                            <span className="text-warn-ink">Pendências: {pending.join("; ")}</span>
                          ) : (
                            <span className="text-good">pronto para publicar</span>
                          )}
                          {productId ? (
                            <>
                              {" · "}
                              <Link href={`/admin/produtos/${productId}`} className="underline hover:text-brand">
                                abrir produto
                              </Link>
                            </>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-sm font-bold">{money(row.priceCents)}</span>
                      <StatusPill label={`nota ${row.score}`} tone={scoreTone(row.score)} />
                      {!review && row.tier === "BRANDED" && row.brandId ? (
                        <button
                          type="submit"
                          formAction={flagWrongBrand}
                          name="id"
                          value={row.id}
                          formNoValidate
                          className="text-[11px] text-muted underline hover:text-brand"
                        >
                          marca errada
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
              <span>
                Página {page} de {totalPages} · {PAGE_SIZE} por página
              </span>
              <span className="flex gap-2">
                {page > 1 ? (
                  <Link href={here({ pagina: String(page - 1) })} className={`${secondaryButton} inline-flex items-center`}>
                    ← Anterior
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link href={here({ pagina: String(page + 1) })} className={`${secondaryButton} inline-flex items-center`}>
                    Próxima →
                  </Link>
                ) : null}
              </span>
            </div>
          </Panel>

          {review ? (
            <Panel title="Publicar em lote">
              <p className="mb-3 text-[11px] text-muted">
                Só publica quem passa no portão: foto verificada, nicho ou categoria, oferta atual com link ativo, conteúdo editorial
                publicado (descrição com 120+ caracteres) e nota de descoberta suficiente. O resto fica com o motivo na linha.
              </p>
              <button type="submit" className={primaryButton}>
                Publicar selecionados
              </button>
            </Panel>
          ) : status.value === "rejeitado" || status.value === "duplicado" ? null : (
            <Panel title="Importar ou rejeitar selecionados">
              <div className="flex flex-col gap-4">
                {niches.length > 0 ? (
                  <>
                    <fieldset className="flex flex-col gap-2">
                      <legend className="mb-1 text-xs font-semibold text-muted">Nichos (aplicados a todos)</legend>
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {niches.map((niche) => (
                          <label key={niche.id} className="flex items-center gap-2 text-[13px]">
                            <input type="checkbox" name="nicheIds" value={niche.id} />
                            {niche.name}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <Field label="Categoria (opcional)" className="max-w-[320px]">
                      <select name="categoryId" className={inputClass} defaultValue="">
                        <option value="">Sem categoria</option>
                        {niches.map((niche) => (
                          <optgroup key={niche.id} label={niche.name}>
                            {niche.categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </Field>
                  </>
                ) : null}
                <p className="text-[11px] text-muted">
                  Até 25 por vez. Preço, link de afiliado e fotos vêm de novo da API; sem link de afiliado o item não é importado. Produto
                  nasce como rascunho.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <button type="submit" className={primaryButton}>
                    Importar selecionados
                  </button>
                  <Field label="Motivo da rejeição" className="w-[260px]">
                    <input name="motivo" className={inputClass} placeholder="ex.: marca falsificada" />
                  </Field>
                  <button type="submit" formAction={rejectCandidates} className={secondaryButton}>
                    Rejeitar selecionados
                  </button>
                </div>
              </div>
            </Panel>
          )}
        </form>
      )}
    </AdminShell>
  );
}
