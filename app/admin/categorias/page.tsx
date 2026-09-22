import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import {
  ErrorBanner,
  EmptyRow,
  Field,
  PageHeader,
  Panel,
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { deleteCategory, deleteNiche, saveCategory, saveNiche } from "@/lib/admin/actions";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Nichos e categorias · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const { erro } = await searchParams;
  const niches = await prisma.niche.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      categories: { orderBy: { name: "asc" } },
      _count: { select: { products: true } },
    },
  });
  const allCategories = niches.flatMap((niche) =>
    niche.categories.map((category) => ({ ...category, nicheName: niche.name })),
  );

  return (
    <AdminShell active="Categorias">
      <PageHeader title="Nichos e categorias" subtitle={`${niches.length} nichos · ${allCategories.length} categorias`} />
      <ErrorBanner message={asText(erro)} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          {niches.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyRow>Nenhum nicho ainda. Crie o primeiro ao lado.</EmptyRow>
            </div>
          ) : null}

          {niches.map((niche) => (
            <section key={niche.id} className="rounded-xl border border-line bg-surface p-5">
              <form action={saveNiche} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_80px_auto]">
                <input type="hidden" name="id" value={niche.id} />
                <Field label={`Nicho · ${niche._count.products} produtos`}>
                  <input name="name" defaultValue={niche.name} className={inputClass} required />
                </Field>
                <Field label="Descrição">
                  <input name="description" defaultValue={niche.description ?? ""} className={inputClass} />
                </Field>
                <Field label="Ordem">
                  <input name="position" type="number" defaultValue={niche.position} className={inputClass} />
                </Field>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <input type="checkbox" name="active" defaultChecked={niche.active} />
                    Ativo
                  </label>
                  <button type="submit" className={secondaryButton}>
                    Salvar
                  </button>
                  <button type="submit" formAction={deleteNiche} className={dangerButton}>
                    Excluir
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-col gap-2 border-t border-line-soft pt-4">
                {niche.categories.length === 0 ? (
                  <p className="text-xs text-muted">Sem categorias neste nicho.</p>
                ) : null}
                {niche.categories.map((category) => (
                  <form
                    key={category.id}
                    action={saveCategory}
                    className="grid items-center gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
                  >
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="nicheId" value={niche.id} />
                    <input name="name" defaultValue={category.name} aria-label="Nome da categoria" className={inputClass} required />
                    <select
                      name="parentId"
                      defaultValue={category.parentId ?? ""}
                      aria-label="Categoria pai"
                      className={inputClass}
                    >
                      <option value="">Sem categoria pai</option>
                      {niche.categories
                        .filter((other) => other.id !== category.id)
                        .map((other) => (
                          <option key={other.id} value={other.id}>
                            {other.name}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" className={secondaryButton}>
                        Salvar
                      </button>
                      <button type="submit" formAction={deleteCategory} className={dangerButton}>
                        Excluir
                      </button>
                    </div>
                  </form>
                ))}

                <form action={saveCategory} className="mt-1 flex flex-wrap gap-2">
                  <input type="hidden" name="nicheId" value={niche.id} />
                  <input name="name" placeholder="Nova categoria neste nicho" aria-label="Nova categoria" className={`${inputClass} max-w-[320px]`} required />
                  <button type="submit" className={secondaryButton}>
                    + Categoria
                  </button>
                </form>
              </div>
              {niche.active ? null : <div className="mt-3"><StatusPill label="inativo" tone="neutral" /></div>}
            </section>
          ))}
        </div>

        <Panel title="Novo nicho">
          <form action={saveNiche} className="flex flex-col gap-3.5">
            <Field label="Nome">
              <input name="name" className={inputClass} placeholder="Ex.: Casa e cozinha" required />
            </Field>
            <Field label="Descrição (opcional)">
              <input name="description" className={inputClass} />
            </Field>
            <button type="submit" className={primaryButton}>
              Adicionar nicho
            </button>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}
