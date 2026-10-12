import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { EmptyRow, ErrorBanner, Field, PageHeader, Panel, dangerButton, inputClass, primaryButton } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { addBlockedTerm, deleteBrand, removeBlockedTerm, saveBrand } from "@/lib/admin/discovery-admin";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Marcas · Admin",
  robots: { index: false, follow: false },
};

export default async function BrandsAdminPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const q = asText(params.q).trim();
  const [brands, total, terms] = await Promise.all([
    prisma.brand.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { aliases: { has: q.toLowerCase() } }] } : undefined,
      orderBy: [{ weight: "desc" }, { name: "asc" }],
      take: 200,
    }),
    prisma.brand.count(),
    prisma.blockedTerm.findMany({ orderBy: { term: "asc" } }),
  ]);
  const notice = asText(params.aviso);

  return (
    <AdminShell active="Marcas">
      <PageHeader
        title="Marcas"
        subtitle={`${total} cadastradas. A marca no título separa produto de marca de genérico; o peso entra na pontuação.`}
      />
      {notice ? (
        <p role="status" className="mb-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
          {notice}
        </p>
      ) : null}
      <ErrorBanner message={asText(params.erro)} />

      <Panel title="Nova marca">
        <form action={saveBrand} className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
          <Field label="Nome">
            <input name="name" required className={inputClass} placeholder="Xiaomi" />
          </Field>
          <Field label="Apelidos (vírgula)">
            <input name="aliases" className={inputClass} placeholder="redmi, poco" />
          </Field>
          <Field label="Peso">
            <select name="weight" defaultValue="1" className={inputClass}>
              <option value="2">Marca forte (2)</option>
              <option value="1">Marca conhecida (1)</option>
            </select>
          </Field>
          <button type="submit" className={primaryButton}>
            Adicionar
          </button>
        </form>
        <p className="mt-3 text-[11px] text-muted">
          Dica: marcas que o Mercado Livre devolve nas correspondências aceitas são boas candidatas. O casamento é por palavra inteira,
          sem acento e sem diferenciar maiúsculas.
        </p>
      </Panel>

      <div className="mt-6">
        <Panel
          title="Marcas cadastradas"
          action={
            <form method="get" className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="buscar" className={`${inputClass} !h-8 w-[160px]`} />
            </form>
          }
        >
          {brands.length === 0 ? (
            <EmptyRow>Nenhuma marca. Rode `npm run discovery:seed` para carregar as marcas iniciais.</EmptyRow>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {brands.map((brand) => (
                <li key={brand.id} className="py-2.5">
                  <form action={saveBrand} className="grid items-end gap-2.5 sm:grid-cols-[1fr_1.4fr_140px_auto_auto_auto]">
                    <input type="hidden" name="id" value={brand.id} />
                    <Field label="Nome">
                      <input name="name" defaultValue={brand.name} className={inputClass} />
                    </Field>
                    <Field label="Apelidos">
                      <input name="aliases" defaultValue={brand.aliases.join(", ")} className={inputClass} />
                    </Field>
                    <Field label="Peso">
                      <select name="weight" defaultValue={String(brand.weight)} className={inputClass}>
                        <option value="2">Forte (2)</option>
                        <option value="1">Conhecida (1)</option>
                      </select>
                    </Field>
                    <label className="flex h-[38px] items-center gap-2 text-[13px]">
                      <input type="checkbox" name="active" defaultChecked={brand.active} /> Ativa
                    </label>
                    <button type="submit" className={primaryButton}>
                      Salvar
                    </button>
                    <button type="submit" formAction={deleteBrand} className={dangerButton}>
                      Remover
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Termos bloqueados">
          <p className="mb-3 text-[12px] text-muted">
            Candidato cujo título contém um destes termos (palavra ou expressão inteira) é descartado na rodada, com o motivo registrado.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {terms.map((term) => (
              <form key={term.id} action={removeBlockedTerm} className="inline-flex items-center gap-1.5">
                <input type="hidden" name="id" value={term.id} />
                <StatusPill label={term.term} tone="neutral" />
                <button type="submit" aria-label={`Liberar ${term.term}`} className="text-xs text-muted hover:text-bad">
                  ×
                </button>
              </form>
            ))}
            {terms.length === 0 ? <span className="text-[12px] text-muted">Lista vazia: vale a lista padrão do código.</span> : null}
          </div>
          <form action={addBlockedTerm} className="flex max-w-[520px] gap-2">
            <input name="term" required className={inputClass} placeholder="termo ou vários separados por vírgula" />
            <button type="submit" className={primaryButton}>
              Bloquear
            </button>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}
