import type { Metadata } from "next";
import { AdminShell, MethodPill, StatusPill } from "@/components/admin-shell";
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
import { deleteStore, saveStore } from "@/lib/admin/actions";
import { asText, type RawParams } from "@/lib/query";
import { listConnectors } from "@/lib/connectors";

export const metadata: Metadata = {
  title: "Lojas · Admin",
  robots: { index: false, follow: false },
};

const METHODS = [
  { value: "MANUAL", label: "Manual" },
  { value: "API", label: "API" },
  { value: "SCRAPER", label: "Coleta web" },
];

export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const { erro } = await searchParams;
  const connectors = listConnectors();
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { offers: true } } },
  });

  return (
    <AdminShell active="Lojas">
      <PageHeader title="Lojas" subtitle={`${stores.length} cadastradas`} />
      <ErrorBanner message={asText(erro)} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {stores.length === 0 ? <EmptyRow>Nenhuma loja cadastrada ainda.</EmptyRow> : null}
          {stores.map((store) => (
            <form
              key={store.id}
              action={saveStore}
              className="grid items-end gap-3 border-b border-line-soft p-4 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_1fr_auto_auto]"
            >
              <input type="hidden" name="id" value={store.id} />
              <Field label={`Nome · ${store._count.offers} ofertas`}>
                <input name="name" defaultValue={store.name} className={inputClass} required />
              </Field>
              <div className="flex flex-col gap-3">
                <Field label="Conector de preços">
                  <select name="connector" defaultValue={store.connector ?? ""} className={inputClass}>
                    <option value="">Nenhum (ofertas manuais)</option>
                    {connectors.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Método (sem conector)">
                  <select name="method" defaultValue={store.method} className={inputClass}>
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="flex h-[38px] items-center gap-2 text-xs font-semibold">
                <input type="checkbox" name="active" defaultChecked={store.active} />
                Ativa
              </label>
              <div className="flex items-center gap-2">
                <button type="submit" className={secondaryButton}>
                  Salvar
                </button>
                <button type="submit" formAction={deleteStore} className={dangerButton}>
                  Excluir
                </button>
                <MethodPill method={store.method} />
                {store.active ? null : <StatusPill label="inativa" tone="neutral" />}
              </div>
            </form>
          ))}
        </div>

        <Panel title="Nova loja">
          <form action={saveStore} className="flex flex-col gap-3.5">
            <Field label="Nome">
              <input name="name" className={inputClass} placeholder="Ex.: Shopee" required />
            </Field>
            <Field label="Conector de preços">
              <select name="connector" defaultValue="" className={inputClass}>
                <option value="">Nenhum (ofertas manuais)</option>
                {connectors.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Método (sem conector)">
              <select name="method" defaultValue="MANUAL" className={inputClass}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-[11px] text-muted">
              Só lojas com conector são atualizadas automaticamente pelo worker. As demais ficam com preço manual.
            </p>
            <button type="submit" className={primaryButton}>
              Adicionar loja
            </button>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}
