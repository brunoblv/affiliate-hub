import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { ErrorBanner, Field, Panel, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { importCandidates } from "@/lib/admin/discovery-actions";
import { PAGE_SIZE, parseShopId, searchShopee, type SearchPage, type SearchSource, type SortMode } from "@/lib/discovery/shopee";
import { SHOPEE_CATEGORIES } from "@/lib/discovery/shopee-categories";
import { money } from "@/lib/format";
import { asText, buildHref, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Candidatos · Admin",
  robots: { index: false, follow: false },
};

const MODES = [
  { value: "palavra", label: "Palavra-chave" },
  { value: "categoria", label: "Categoria" },
  { value: "loja", label: "Loja" },
] as const;
type Mode = (typeof MODES)[number]["value"];

const SORTS: { value: SortMode; label: string }[] = [
  { value: "sales", label: "Mais vendidos" },
  { value: "relevance", label: "Relevância" },
  { value: "commission", label: "Maior comissão" },
];

function toSource(mode: Mode, q: string, categoria: string): { source: SearchSource | null; problem?: string } {
  if (mode === "palavra") return q ? { source: { kind: "keyword", keyword: q } } : { source: null };
  if (mode === "categoria") {
    const id = Number(categoria);
    return Number.isInteger(id) && id > 0 ? { source: { kind: "category", categoryId: id } } : { source: null };
  }
  if (!q) return { source: null };
  const shopId = parseShopId(q);
  return shopId
    ? { source: { kind: "shop", shopId } }
    : {
        source: null,
        problem: "Não achei o ID da loja. Cole o ID numérico, uma URL /shop/ID ou a URL de qualquer produto dela.",
      };
}

const scoreTone = (score: number) => (score >= 75 ? "good" : score >= 50 ? "warn" : "neutral");

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const mode = (MODES.find((m) => m.value === asText(params.modo))?.value ?? "palavra") as Mode;
  const q = asText(params.q).trim();
  const categoria = asText(params.categoria);
  const sort = (SORTS.find((s) => s.value === asText(params.ordem))?.value ?? "sales") as SortMode;
  const page = Math.max(1, Number.parseInt(asText(params.pagina), 10) || 1);

  const { source, problem } = toSource(mode, q, categoria);
  let result: SearchPage | null = null;
  let searchError = problem ?? "";
  if (source) {
    try {
      result = await searchShopee(source, sort, page);
    } catch (error) {
      searchError = error instanceof Error ? error.message : "Falha ao consultar a Shopee.";
    }
  }

  const listingIds = result?.candidates.map((c) => c.itemId) ?? [];
  const [registered, niches] = await Promise.all([
    listingIds.length
      ? prisma.offer.findMany({
          where: { store: { connector: "shopee" }, externalListingId: { in: listingIds } },
          select: { externalListingId: true },
        })
      : Promise.resolve([]),
    prisma.niche.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { categories: { orderBy: { name: "asc" } } },
    }),
  ]);
  const known = new Set(registered.map((o) => o.externalListingId));
  // Item que já virou oferta no sistema não volta a aparecer na pesquisa.
  const visible = result?.candidates.filter((c) => !known.has(c.itemId)) ?? [];
  const hidden = (result?.candidates.length ?? 0) - visible.length;

  const here = (overrides: RawParams) =>
    buildHref("/admin/candidatos", { modo: mode, q, categoria, ordem: sort, pagina: String(page), ...overrides });
  const self = here({});
  const notice = asText(params.aviso);

  return (
    <AdminShell active="Candidatos">
      <h1 className="text-2xl font-bold tracking-[-0.025em]">Candidatos a produto</h1>
      <p className="mb-5 mt-1 text-[13px] text-muted">
        Busque na Shopee, veja a pontuação de potencial de venda e importe em lote como rascunho.
      </p>

      {notice ? (
        <p role="status" className="mb-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
          {notice}
        </p>
      ) : null}
      <ErrorBanner message={asText(params.erro) || searchError} />

      <Panel title="Buscar">
        <form method="get" className="grid gap-3.5 sm:grid-cols-[160px_1fr_180px_auto] sm:items-end">
          <Field label="Buscar por">
            <select name="modo" defaultValue={mode} className={inputClass}>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Palavra-chave, ID/URL da loja">
            <input name="q" defaultValue={q} className={inputClass} placeholder="escorredor de louça · 1789916720 · URL de um produto da loja" />
          </Field>
          <Field label="Categoria (modo Categoria)">
            <select name="categoria" defaultValue={categoria} className={inputClass}>
              <option value="">—</option>
              {SHOPEE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ordenar">
            <select name="ordem" defaultValue={sort} className={inputClass}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-4">
            <button type="submit" className={primaryButton}>
              Buscar
            </button>
          </div>
        </form>
        <p className="mt-3 text-[11px] text-muted">
          A busca só devolve o que a Shopee expõe para afiliados. A pontuação (0–100) combina vendas, nota, desconto, comissão e
          faixa de preço; dentro de cada página os itens vêm da maior para a menor.
        </p>
      </Panel>

      {result ? (
        <form action={importCandidates} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="voltar" value={self} />
          <Panel title={`Resultados · página ${result.page}`}>
            {visible.length === 0 ? (
              <p className="px-1 py-4 text-[13px] text-muted">
                {hidden > 0 ? "Todos os itens desta página já estão cadastrados." : "Nada encontrado para essa busca."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {visible.map((c) => {
                  return (
                    <li key={c.key} className="grid grid-cols-[auto_56px_1fr_auto] items-center gap-3 py-3">
                      <input
                        type="checkbox"
                        name="sel"
                        value={c.key}
                        aria-label={`Selecionar ${c.name}`}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.imageUrl ?? ""} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[13px] font-semibold">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {c.shopName ?? `Loja ${c.shopId}`} · {c.reasons.join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <span className="text-sm font-bold">{money(c.priceCents)}</span>
                        <StatusPill label={`nota ${c.score}`} tone={scoreTone(c.score)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
              <span>
                {PAGE_SIZE} por página{hidden > 0 ? ` · ${hidden} já cadastrado${hidden === 1 ? "" : "s"} oculto${hidden === 1 ? "" : "s"}` : ""}
              </span>
              <span className="flex gap-2">
                {page > 1 ? (
                  <Link href={here({ pagina: String(page - 1) })} className={`${secondaryButton} inline-flex items-center`}>
                    ← Anterior
                  </Link>
                ) : null}
                {result.hasNextPage ? (
                  <Link href={here({ pagina: String(page + 1) })} className={`${secondaryButton} inline-flex items-center`}>
                    Próxima →
                  </Link>
                ) : null}
              </span>
            </div>
          </Panel>

          {visible.length > 0 ? (
            <Panel title="Importar selecionados">
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
                  Os produtos nascem como rascunho com a oferta da Shopee (preço, link de afiliado e foto vêm da API). Revise nome e
                  resumo antes de publicar.
                </p>
                <div>
                  <button type="submit" className={primaryButton}>
                    Importar selecionados
                  </button>
                </div>
              </div>
            </Panel>
          ) : null}
        </form>
      ) : null}
    </AdminShell>
  );
}
