import { PendingButton } from "@/components/pending-button";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { EmptyRow, ErrorBanner, Field, PageHeader, Panel, dangerButton, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { deleteQuery, runQueryNow, saveQuery } from "@/lib/admin/discovery-admin";
import { discoveryConfig } from "@/lib/discovery/config";
import { SOURCE_CONNECTOR } from "@/lib/discovery/run";
import { getConnector } from "@/lib/connectors";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Descoberta · Admin",
  robots: { index: false, follow: false },
};

const SOURCES = [
  { value: "SHOPEE_API", label: "Shopee" },
  { value: "ALIEXPRESS_API", label: "AliExpress" },
];
const KINDS = [
  { value: "hot", label: "Em alta (sem filtro)" },
  { value: "keyword", label: "Palavra-chave" },
  { value: "category", label: "Categoria (ID)" },
  { value: "shop", label: "Loja (ID)" },
  { value: "promo", label: "Promoção da plataforma (AliExpress)" },
];
const SORTS = [
  { value: "sales", label: "Mais vendidos" },
  { value: "relevance", label: "Relevância" },
  { value: "commission", label: "Maior comissão" },
  { value: "discount", label: "Maior desconto" },
];

const stamp = (date: Date | null) =>
  date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date) : "—";

const runTone = (status: string) => (status === "DONE" ? "good" : status === "FAILED" ? "bad" : "neutral");

function QueryFields({ query, niches }: { query?: Awaited<ReturnType<typeof loadQueries>>[number]; niches: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[140px_200px_1fr_160px]">
      <Field label="Fonte">
        <select name="source" defaultValue={query?.source ?? "SHOPEE_API"} className={inputClass}>
          {SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tipo">
        <select name="kind" defaultValue={query?.kind ?? "hot"} className={inputClass}>
          {KINDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Valor (palavra, ID da categoria ou da loja)">
        <input name="value" defaultValue={query?.value ?? ""} className={inputClass} />
      </Field>
      <Field label="Ordenar">
        <select name="sort" defaultValue={query?.sort ?? "sales"} className={inputClass}>
          {SORTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Páginas por rodada">
        <input name="pages" type="number" min={1} max={10} defaultValue={query?.pages ?? 2} className={inputClass} />
      </Field>
      <Field label="Cota por dia (0 = sem)">
        <input name="quota" type="number" min={0} defaultValue={query?.quota ?? 0} className={inputClass} />
      </Field>
      <Field label="Nicho dos importados">
        <select name="nicheId" defaultValue={query?.nicheId ?? ""} className={inputClass}>
          <option value="">—</option>
          {niches.map((niche) => (
            <option key={niche.id} value={niche.id}>
              {niche.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Posição">
        <input name="position" type="number" defaultValue={query?.position ?? 0} className={inputClass} />
      </Field>
    </div>
  );
}

const loadQueries = () => prisma.discoveryQuery.findMany({ orderBy: [{ source: "asc" }, { position: "asc" }, { createdAt: "asc" }] });

export default async function DiscoveryAdminPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const config = discoveryConfig();
  const [queries, runs, niches] = await Promise.all([
    loadQueries(),
    prisma.discoveryRun.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { query: { select: { kind: true, value: true } } } }),
    prisma.niche.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const notice = asText(params.aviso);

  return (
    <AdminShell active="Descoberta">
      <PageHeader title="Descoberta automática" subtitle="Pautas, rodadas diárias e o que a filtragem descartou." />
      {notice ? (
        <p role="status" className="mb-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
          {notice}
        </p>
      ) : null}
      <ErrorBanner message={asText(params.erro)} />

      <Panel title="Estado">
        <ul className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          <li>
            Rodada diária:{" "}
            <StatusPill label={config.enabled ? "ligada" : "desligada"} tone={config.enabled ? "good" : "warn"} /> às {String(config.hour).padStart(2, "0")}h
            {config.enabled ? "" : " (DISCOVERY_ENABLED=false: o worker não faz nenhum request)"}
          </li>
          <li>Limite: {config.dailyLimit} importados por dia · nota mínima {config.minScore}</li>
          <li>
            Cotas: marca ≥ {config.brandedMinPct}% · genérico ≤ {config.genericMaxPct}%
          </li>
          <li>
            Publicação automática: <StatusPill label={config.autopublish ? "ligada" : "desligada"} tone={config.autopublish ? "warn" : "good"} />
          </li>
          {SOURCES.map((source) => {
            const connector = getConnector(SOURCE_CONNECTOR[source.value as keyof typeof SOURCE_CONNECTOR]);
            return (
              <li key={source.value}>
                {source.label}:{" "}
                <StatusPill
                  label={connector?.isConfigured() ? "credenciais ok" : "sem credenciais"}
                  tone={connector?.isConfigured() ? "good" : "bad"}
                />
              </li>
            );
          })}
        </ul>
        <form action={runQueryNow} className="mt-4">
          <PendingButton
            className={primaryButton}
            pendingLabel="Rodando a descoberta…"
            hint="Buscando nas lojas e importando. Pode levar vários minutos: não feche esta página."
          >
            Rodar todas as pautas agora
          </PendingButton>
          <span className="ml-3 text-[11px] text-muted">Pedido explícito: vale mesmo com a rodada diária desligada.</span>
        </form>
      </Panel>

      <div className="mt-6 flex flex-col gap-4">
        <h2 className="text-[15px] font-bold">Pautas</h2>
        {queries.length === 0 ? (
          <EmptyRow>Nenhuma pauta. Rode `npm run discovery:seed` para criar as pautas padrão (25 Shopee + 25 AliExpress) ou cadastre abaixo.</EmptyRow>
        ) : null}
        {queries.map((query) => (
          <Panel
            key={query.id}
            title={`${SOURCES.find((item) => item.value === query.source)?.label ?? query.source} · ${query.kind}${query.value ? ` · ${query.value}` : ""}`}
            action={<span className="text-xs text-muted">última rodada: {stamp(query.lastRunAt)}</span>}
          >
            <form action={saveQuery} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={query.id} />
              <QueryFields query={query} niches={niches} />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" name="active" defaultChecked={query.active} /> Ativa
                </label>
                <PendingButton className={primaryButton} pendingLabel="Salvando…">
                  Salvar
                </PendingButton>
                <PendingButton
                  formAction={runQueryNow}
                  className={secondaryButton}
                  pendingLabel="Rodando…"
                  hint="Buscando nesta pauta. Pode levar alguns minutos: não feche a página."
                >
                  Rodar agora
                </PendingButton>
                <PendingButton formAction={deleteQuery} className={dangerButton} pendingLabel="Removendo…">
                  Remover
                </PendingButton>
              </div>
            </form>
          </Panel>
        ))}

        <Panel title="Nova pauta">
          <form action={saveQuery} className="flex flex-col gap-3">
            <QueryFields niches={niches} />
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="active" defaultChecked /> Ativa
            </label>
            <div>
              <PendingButton className={primaryButton} pendingLabel="Criando…">
                Criar pauta
              </PendingButton>
            </div>
          </form>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Últimas rodadas">
          {runs.length === 0 ? (
            <EmptyRow>Nenhuma rodada ainda.</EmptyRow>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Início</th>
                    <th className="pr-3 font-semibold">Fonte / pauta</th>
                    <th className="pr-3 font-semibold">Estado</th>
                    <th className="pr-3 font-semibold">Achados</th>
                    <th className="pr-3 font-semibold">Mantidos</th>
                    <th className="pr-3 font-semibold">Importados</th>
                    <th className="pr-3 font-semibold">Descartados e por quê</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {runs.map((run) => {
                    const rejections = Object.entries((run.rejections as Record<string, number> | null) ?? {}).sort((a, b) => b[1] - a[1]);
                    return (
                      <tr key={run.id} className="align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">{stamp(run.startedAt ?? run.createdAt)}</td>
                        <td className="pr-3">
                          {SOURCES.find((item) => item.value === run.source)?.label} · {run.query?.kind ?? "pauta removida"}
                          {run.query?.value ? ` · ${run.query.value}` : ""}
                        </td>
                        <td className="pr-3">
                          <StatusPill label={run.status === "DONE" ? "ok" : run.status === "FAILED" ? "falhou" : run.status} tone={runTone(run.status)} />
                          {run.error ? <p className="mt-1 max-w-[260px] text-bad-ink">{run.error}</p> : null}
                        </td>
                        <td className="pr-3">{run.found}</td>
                        <td className="pr-3">{run.kept}</td>
                        <td className="pr-3">{run.imported}</td>
                        <td className="pr-3">
                          {run.rejected} {rejections.length ? `(${rejections.map(([reason, count]) => `${reason}: ${count}`).join(", ")})` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
