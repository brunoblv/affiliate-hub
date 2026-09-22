import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { EmptyRow, primaryButton } from "@/components/admin-ui";
import { SearchIcon } from "@/components/icons";
import { prisma } from "@/lib/db";
import { ProductStatus } from "@/lib/generated/prisma/enums";
import { integer, moneyShort } from "@/lib/format";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Produtos · Admin",
  robots: { index: false, follow: false },
};

const STATUS: Record<ProductStatus, { label: string; tone: "good" | "warn" | "neutral" }> = {
  PUBLISHED: { label: "Publicado", tone: "good" },
  DRAFT: { label: "Rascunho", tone: "warn" },
  ARCHIVED: { label: "Arquivado", tone: "neutral" },
};

const COLUMNS = "grid-cols-[minmax(0,2.4fr)_1.2fr_1fr_.7fr_1fr_.9fr]";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const term = asText(params.q);
  const nicheFilter = asText(params.nicho);
  const statusFilter = asText(params.status);

  const [total, niches, products] = await Promise.all([
    prisma.product.count(),
    prisma.niche.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { slug: { contains: term, mode: "insensitive" } },
                { gtin: { contains: term } },
              ],
            }
          : {}),
        ...(nicheFilter ? { niches: { some: { nicheId: nicheFilter } } } : {}),
        ...(statusFilter in ProductStatus ? { status: statusFilter as ProductStatus } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        niches: { include: { niche: true } },
        variants: { include: { offers: { where: { active: true } } } },
      },
    }),
  ]);

  return (
    <AdminShell active="Produtos">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Produtos</h1>
          <p className="text-[13px] text-muted">
            {integer(products.length)} de {integer(total)} produtos
          </p>
        </div>
        <Link href="/admin/produtos/novo" className={`${primaryButton} flex items-center`}>
          + Novo produto
        </Link>
      </div>

      <form method="get" className="my-5 flex flex-wrap gap-2.5">
        <div className="flex items-center gap-2 rounded-[9px] border border-line bg-surface px-3 focus-within:border-brand">
          <SearchIcon size={14} className="flex-none text-muted" />
          <label htmlFor="admin-busca" className="sr-only">
            Buscar produto
          </label>
          <input
            id="admin-busca"
            name="q"
            defaultValue={term}
            placeholder="Nome, slug ou GTIN"
            className="h-[34px] w-[240px] max-w-full bg-transparent text-[13px] outline-none placeholder:text-muted"
          />
        </div>
        <select
          name="nicho"
          defaultValue={nicheFilter}
          aria-label="Nicho"
          className="h-[36px] rounded-lg border border-line bg-surface px-2.5 text-xs font-medium outline-none focus:border-brand"
        >
          <option value="">Nicho</option>
          {niches.map((niche) => (
            <option key={niche.id} value={niche.id}>
              {niche.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          aria-label="Status"
          className="h-[36px] rounded-lg border border-line bg-surface px-2.5 text-xs font-medium outline-none focus:border-brand"
        >
          <option value="">Status</option>
          {(Object.keys(STATUS) as ProductStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS[status].label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-[36px] rounded-lg border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <div className="min-w-[860px]">
          <div
            className={`grid ${COLUMNS} gap-3.5 border-b border-line bg-canvas px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted`}
          >
            <span>Produto</span>
            <span>Nichos</span>
            <span>Marca</span>
            <span>Ofertas</span>
            <span>Menor preço</span>
            <span>Status</span>
          </div>

          {products.length === 0 ? (
            <EmptyRow>{total === 0 ? "Nenhum produto cadastrado. Comece por “Novo produto”." : "Nenhum produto com esses filtros."}</EmptyRow>
          ) : null}

          {products.map((product) => {
            const offers = product.variants.flatMap((variant) => variant.offers);
            const prices = offers.flatMap((offer) => (offer.priceCents === null ? [] : [offer.priceCents]));
            const lowest = prices.length ? Math.min(...prices) : null;
            const status = STATUS[product.status];
            return (
              <Link
                key={product.id}
                href={`/admin/produtos/${product.id}`}
                className={`grid ${COLUMNS} items-center gap-3.5 border-b border-line-soft px-4.5 py-3 text-[13px] last:border-b-0 hover:bg-canvas`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{product.name}</span>
                  <span className="block truncate text-[11px] text-muted">{product.slug}</span>
                </span>
                <span className="truncate text-muted">
                  {product.niches.map((item) => item.niche.name).join(", ") || "—"}
                </span>
                <span className="text-muted">{product.brand ?? "—"}</span>
                <span className="font-semibold">{offers.length}</span>
                <span className="font-bold">{lowest === null ? "—" : moneyShort(lowest)}</span>
                <StatusPill label={status.label} tone={status.tone} />
              </Link>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
