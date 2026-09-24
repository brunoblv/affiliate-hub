import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader, Panel, inputClass, primaryButton } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin/guard";
import { metricsDashboard } from "@/lib/metrics/dashboard";
import { METRIC_DAYS, noResultRate } from "@/lib/metrics/report";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "Métricas · Admin", robots: { index: false, follow: false } };
const integer = (n: number) => n.toLocaleString("pt-BR");

export default async function MetricsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin();
  const report = await metricsDashboard(asText((await searchParams).dias));
  return <AdminShell active="Métricas">
    <PageHeader title="Métricas" subtitle="Eventos registrados no Hub · horários de São Paulo" />
    <form action="/admin/metricas" className="mb-5 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">Período<select name="dias" defaultValue={report.days} className={inputClass}>{METRIC_DAYS.map((days) => <option key={days} value={days}>Últimos {days} dias, incluindo hoje</option>)}</select></label>
      <button className={primaryButton}>Atualizar painel</button>
    </form>
    {!process.env.AUTH_SECRET ? <p role="status" className="mb-4 text-sm text-bad">AUTH_SECRET não configurado: buscas e visualizações não estão sendo registradas.</p> : null}
    <p className="mb-6 text-sm text-muted">Buscas e visualizações começam a ser medidas após a instalação desta etapa e dependem de JavaScript e de aba visível. Resultados consideram os filtros; consultas sem termo também são contadas. Cliques incluem o histórico já registrado. São eventos, não visitantes únicos, adesões confirmadas ou vendas. Receita e comissão ainda não possuem fonte de confirmação.</p>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[["Buscas / consultas", integer(report.searches)], ["Buscas sem resultado", integer(report.noResults)], ["Taxa sem resultado", noResultRate(report.searches, report.noResults)], ["Visualizações de produto", integer(report.views)], ["Cliques em ofertas", integer(report.offerClicks)], ["Cliques em comunidades", integer(report.communityClicks)]].map(([label, value]) => <section key={label} className="rounded-xl border border-line bg-surface p-5"><h2 className="text-sm text-muted">{label}</h2><p className="mt-2 text-3xl font-bold">{value}</p></section>)}
    </div>
    <Panel title="Evolução diária">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Contagens diárias no período selecionado, inclusive dias sem eventos</caption>
        <thead><tr>{["Dia", "Buscas", "Sem resultado", "Produtos vistos", "Cliques em ofertas", "Cliques em comunidades"].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2">{label}</th>)}</tr></thead>
        <tbody>{[...report.daily].reverse().map((day) => <tr key={day.day} className="border-t border-line"><th scope="row" className="whitespace-nowrap px-3 py-2 font-normal">{day.day.split("-").reverse().join("/")}</th>{[day.searches, day.noResults, day.views, day.offers, day.communities].map((value, index) => <td key={index} className="px-3 py-2 tabular-nums">{integer(value)}</td>)}</tr>)}</tbody>
      </table></div>
    </Panel>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <Ranking title="10 termos mais consultados" rows={report.terms} />
      <Ranking title="10 termos sem resultado mais frequentes" rows={report.emptyTerms} />
      <Ranking title="10 produtos mais visualizados" rows={report.products} />
      <Ranking title="10 ofertas mais clicadas" rows={report.offers} />
      <Ranking title="10 comunidades mais clicadas · por nicho do clique" rows={report.communities} />
    </div>
  </AdminShell>;
}

function Ranking({ title, rows }: { title: string; rows: { label: string; detail?: string; count: number }[] }) {
  return <Panel title={title}>{rows.length ? <ol className="divide-y divide-line">{rows.map((row, index) => <li key={index} className="flex items-start justify-between gap-4 py-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{row.label}</p>{row.detail ? <p className="mt-1 break-words text-xs text-muted">{row.detail}</p> : null}</div><span className="font-bold tabular-nums">{integer(row.count)}</span></li>)}</ol> : <p className="text-sm text-muted">Nenhum evento registrado neste período.</p>}</Panel>;
}
