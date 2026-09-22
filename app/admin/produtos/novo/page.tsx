import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { ErrorBanner, Field, Panel, inputClass, primaryButton } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { createProduct } from "@/lib/admin/actions";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Novo produto · Admin",
  robots: { index: false, follow: false },
};

export default async function NewProductPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const { erro } = await searchParams;
  const niches = await prisma.niche.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { categories: { orderBy: { name: "asc" } } },
  });

  return (
    <AdminShell active="Produtos">
      <p className="text-xs text-muted">
        <Link href="/admin/produtos" className="hover:text-brand">
          Produtos
        </Link>{" "}
        › Novo
      </p>
      <h1 className="mb-6 mt-2.5 text-2xl font-bold tracking-[-0.025em]">Novo produto</h1>
      <ErrorBanner message={asText(erro)} />

      <div className="max-w-[720px]">
        <Panel title="Dados básicos">
          <form action={createProduct} className="flex flex-col gap-4">
            <Field label="Nome">
              <input name="name" className={inputClass} required autoFocus />
            </Field>
            <Field label="Marca (opcional)">
              <input name="brand" className={inputClass} />
            </Field>

            {niches.length === 0 ? (
              <p className="rounded-lg bg-warn-bg px-3 py-2.5 text-xs text-warn-ink">
                Ainda não há nichos.{" "}
                <Link href="/admin/categorias" className="font-semibold underline">
                  Crie um nicho
                </Link>{" "}
                para classificar o produto (dá para fazer depois também).
              </p>
            ) : (
              <>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-xs font-semibold text-muted">Nichos</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {niches.map((niche) => (
                      <label key={niche.id} className="flex items-center gap-2 text-[13px]">
                        <input type="checkbox" name="nicheIds" value={niche.id} />
                        {niche.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Categoria (opcional)">
                  <select name="categoryId" className={inputClass} defaultValue="">
                    <option value="">Sem categoria</option>
                    {niches.map((niche) => (
                      <optgroup key={niche.id} label={niche.name}>
                        {niche.categories.length === 0 ? (
                          <option disabled>(sem categorias — crie em Nichos e categorias)</option>
                        ) : null}
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
            )}

            <p className="text-[11px] text-muted">
              O produto nasce como rascunho, com a variação “Padrão”. Ofertas, imagens e resumo ficam no editor.
            </p>
            <div>
              <button type="submit" className={primaryButton}>
                Criar produto
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}
