import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { EmptyRow, Panel, dangerButton, primaryButton, secondaryButton } from "@/components/admin-ui";
import { approveReview, rejectReview, resetOfferFailures, syncAll, syncStore } from "@/lib/admin/sync-actions";
import { elapsed, money } from "@/lib/format";
import { asText, type RawParams } from "@/lib/query";
import { getSyncOverview, getSyncPending } from "@/lib/sync/stats";

export const metadata: Metadata = {
  title: "Atualização de preços · Admin",
  robots: { index: false, follow: false },
};

const minutesSince = (date: Date | null, now: number) => (date ? Math.max(0, Math.round((now - date.getTime()) / 60_000)) : null);
const ago = (date: Date | null, now: number) => {
  const minutes = minutesSince(date, now);
  return minutes === null ? "nunca" : `há ${elapsed(minutes)}`;
};

const JOB_TONE = { QUEUED: "warn", RUNNING: "warn", DONE: "good", FAILED: "bad" } as const;
const JOB_LABEL = { QUEUED: "Na fila", RUNNING: "Executando", DONE: "Concluído", FAILED: "Falhou" } as const;
const OUTCOME_LABEL: Record<string, string> = {
  updated: "preço atualizado",
  unchanged: "sem mudança",
  review: "em revisão",
  not_found: "anúncio não encontrado",
  error: "erro",
  skipped: "ignorado",
  not_configured: "sem credenciais",
};

export default async function PriceSyncPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const query = await searchParams;
  const now = Date.now();
  const [overview, pending] = await Promise.all([getSyncOverview(new Date(now)), getSyncPending()]);
  const { totals, worker } = overview;
  const notice = asText(query.aviso);

  return (
    <AdminShell active="Atualização de preços">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Atualização de preços</h1>
          <p className="text-[13px] text-muted">
            {overview.lastRunAt ? `Última coleta ${ago(overview.lastRunAt, now)}` : "Nenhuma coleta registrada"} · ciclo diário a
            partir das 03h (São Paulo)
          </p>
        </div>
        <form action={syncAll}>
          <button type="submit" className={primaryButton}>
            Executar atualização
          </button>
        </form>
      </div>

      {notice ? (
        <p role="status" className="mt-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
          {notice}
        </p>
      ) : null}

      {worker.alive ? (
        <p className="mt-5 flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
          Worker ativo (visto {ago(worker.lastSeenAt, now)})
        </p>
      ) : (
        <p role="alert" className="mt-5 rounded-[10px] bg-warn-bg px-4 py-3 text-[13px] text-warn-ink">
          <strong>O worker não está rodando</strong> ({worker.lastSeenAt ? `visto pela última vez ${ago(worker.lastSeenAt, now)}` : "nunca iniciou"}
          ). Os pedidos ficam na fila, mas só são executados quando ele estiver ativo. Inicie com{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">npm run worker</code>.
        </p>
      )}

      <dl className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <Metric value={totals.monitored} label="ofertas monitoradas" />
        <Metric value={totals.updated} label="atualizadas neste ciclo" accent="text-good" />
        <Metric value={totals.queued + totals.running} label="na fila" accent="text-warn-ink" />
        <Metric value={totals.expired} label="vencidas (mais de 24 h)" accent={totals.expired ? "text-warn-ink" : undefined} />
        <Metric value={totals.failed + totals.stale} label="com erro ou sem anúncio" accent={totals.failed + totals.stale ? "text-bad" : undefined} />
        <Metric value={totals.review} label="preços em revisão" accent={totals.review ? "text-warn-ink" : undefined} />
      </dl>

      <div className="mt-6 flex flex-col gap-6">
        <Panel title="Lojas com conector">
          {overview.stores.length === 0 ? (
            <div className="rounded-[10px] border border-line">
              <EmptyRow>
                Nenhuma loja com conector. Em{" "}
                <Link href="/admin/lojas" className="font-semibold text-brand">
                  Lojas
                </Link>
                , escolha o conector da Shopee.
              </EmptyRow>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-line">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="bg-canvas text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Loja</th>
                    <th className="px-4 py-2.5">Conector</th>
                    <th className="px-4 py-2.5">Ofertas</th>
                    <th className="px-4 py-2.5">Problemas</th>
                    <th className="px-4 py-2.5">Última coleta</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {overview.stores.map((store) => (
                    <tr key={store.id} className="border-t border-line-soft">
                      <td className="px-4 py-3 font-semibold">
                        {store.name}
                        {store.active ? null : <span className="ml-2 text-xs font-normal text-muted">(inativa)</span>}
                      </td>
                      <td className="px-4 py-3">
                        {store.connectorLabel}
                        {store.configured ? null : (
                          <span className="ml-2 rounded bg-bad-bg px-1.5 py-0.5 text-[10px] font-bold text-bad-ink">SEM CREDENCIAIS</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{store.offerCount}</td>
                      <td className="px-4 py-3">
                        {store.failing + store.review === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className="font-semibold text-bad">
                            {store.failing} erro · {store.review} revisão
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{ago(store.lastOk, now)}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={syncStore}>
                          <input type="hidden" name="storeId" value={store.id} />
                          <button type="submit" className={secondaryButton}>
                            Atualizar loja
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {pending.review.length > 0 ? (
          <Panel title={`Preços em revisão (${pending.review.length})`}>
            <p className="mb-3 text-xs text-muted">
              A coleta trouxe um valor muito diferente do publicado. Ele só entra no site se você aprovar; enquanto isso o preço
              antigo continua valendo.
            </p>
            <div className="flex flex-col gap-2.5">
              {pending.review.map((offer) => (
                <div key={offer.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[10px] border border-line p-3.5">
                  <div className="min-w-[220px] flex-1">
                    <Link href={`/admin/produtos/${offer.variant.product.id}?aba=ofertas`} className="text-sm font-semibold hover:text-brand">
                      {offer.variant.product.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {offer.store.name} · {offer.sellerName}
                    </p>
                    <p className="mt-1 text-xs text-warn-ink">{offer.reviewReason}</p>
                  </div>
                  <div className="text-[13px]">
                    <span className="text-muted">Publicado </span>
                    <strong>{offer.priceCents === null ? "—" : money(offer.priceCents)}</strong>
                    <span className="mx-2 text-muted">→</span>
                    <span className="text-muted">Coletado </span>
                    <strong className="text-warn-ink">{offer.pendingPriceCents === null ? "—" : money(offer.pendingPriceCents)}</strong>
                  </div>
                  <div className="flex gap-2">
                    <form action={approveReview}>
                      <input type="hidden" name="offerId" value={offer.id} />
                      <button type="submit" className={secondaryButton}>
                        Aprovar novo preço
                      </button>
                    </form>
                    <form action={rejectReview}>
                      <input type="hidden" name="offerId" value={offer.id} />
                      <button type="submit" className={dangerButton}>
                        Manter o antigo
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {pending.problems.length > 0 ? (
          <Panel title={`Ofertas com problema (${pending.problems.length})`}>
            <p className="mb-3 text-xs text-muted">
              O último preço conhecido foi mantido, mas essas ofertas deixam de valer como “atuais” no site enquanto não forem
              coletadas de novo.
            </p>
            <div className="flex flex-col gap-2.5">
              {pending.problems.map((offer) => (
                <div key={offer.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[10px] border border-line p-3.5">
                  <div className="min-w-[220px] flex-1">
                    <Link href={`/admin/produtos/${offer.variant.product.id}?aba=ofertas`} className="text-sm font-semibold hover:text-brand">
                      {offer.variant.product.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {offer.store.name} · {offer.sellerName} · {offer.consecutiveFailures} falhas seguidas
                    </p>
                    <p className="mt-1 text-xs text-bad-ink">{offer.lastError ?? "Sem detalhe do erro."}</p>
                  </div>
                  <StatusPill label={offer.status === "ERROR" ? "erro" : "desatualizada"} tone={offer.status === "ERROR" ? "bad" : "warn"} />
                  <form action={resetOfferFailures}>
                    <input type="hidden" name="offerId" value={offer.id} />
                    <button type="submit" className={secondaryButton}>
                      Tentar de novo agora
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel title="Coletas recentes">
          {overview.jobs.length === 0 ? (
            <div className="rounded-[10px] border border-line">
              <EmptyRow>Nenhuma coleta ainda.</EmptyRow>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-line">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="bg-canvas text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Oferta</th>
                    <th className="px-4 py-2.5">Origem</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Resultado</th>
                    <th className="px-4 py-2.5">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.jobs.map((job) => (
                    <tr key={job.id} className="border-t border-line-soft align-top">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{job.label}</span>
                        <span className="block text-xs text-muted">{job.store}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {job.reason === "SCHEDULED" ? "Agendada" : job.reason === "MANUAL" ? "Manual" : "Nova tentativa"}
                        {job.attempts > 1 ? ` · ${job.attempts}ª tentativa` : ""}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill label={JOB_LABEL[job.status]} tone={JOB_TONE[job.status]} />
                      </td>
                      <td className="px-4 py-2.5">
                        {job.outcome ? OUTCOME_LABEL[job.outcome] ?? job.outcome : "—"}
                        {job.error ? <span className="block text-xs text-bad-ink">{job.error}</span> : null}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {job.status === "QUEUED" && job.scheduledFor.getTime() > now
                          ? `em ${elapsed(Math.round((job.scheduledFor.getTime() - now) / 60_000))}`
                          : ago(job.finishedAt ?? job.scheduledFor, now)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

function Metric({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-4">
      <dt className="sr-only">{label}</dt>
      <dd className="flex flex-col gap-1">
        <span className={`text-[28px] font-extrabold tracking-[-0.04em] ${accent ?? ""}`}>{value}</span>
        <span className="text-xs text-muted">{label}</span>
      </dd>
    </div>
  );
}
