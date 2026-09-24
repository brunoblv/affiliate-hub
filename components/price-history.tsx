"use client";

import { useState } from "react";
import { polyline } from "@/lib/chart";
import { moneyShort } from "@/lib/format";
import { analyzePriceHistory, type HistoryAnalysis, type Observation } from "@/lib/history/analysis";

export type HistoryPoint = Observation;

type RangeKey = "30d" | "90d" | "6m" | "1a";

const RANGES: { key: RangeKey; days: number; short: string }[] = [
  { key: "30d", days: 30, short: "30 dias" },
  { key: "90d", days: 90, short: "90 dias" },
  { key: "6m", days: 182, short: "6 meses" },
  { key: "1a", days: 365, short: "1 ano" },
];

const DAY = 24 * 60 * 60 * 1000;
const W = 900;
const H = 260;
const PAD = 18;

/** Observações diárias comparáveis; dias sem coleta não entram na média. */
export function PriceHistory({
  points, nowMs, currentCents, maxAgeMs, offerLabel,
}: {
  points: HistoryPoint[];
  nowMs: number;
  currentCents: number | null;
  maxAgeMs: number;
  offerLabel: string | null;
}) {
  const [range, setRange] = useState<RangeKey>("30d");
  const config = RANGES.find((item) => item.key === range)!;
  const from = nowMs - config.days * DAY;

  const analysis = analyzePriceHistory({ points, from, now: nowMs, currentCents, maxAgeMs });
  const difference = analysis.differenceFromAveragePercent;
  const relativeAverage = difference === 0 ? "igual a" : difference !== null && difference < 0 ? "abaixo de" : "acima de";

  return (
    <section aria-labelledby="historico">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id="historico" className="text-[22px] font-bold tracking-[-0.025em]">
          Histórico de preços
        </h2>
        <div
          role="tablist"
          aria-label="Período do histórico"
          className="flex gap-1.5 rounded-[10px] border border-line bg-surface p-1"
        >
          {RANGES.map((item) => {
            const selected = item.key === range;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRange(item.key)}
                className={`rounded-[7px] px-3 py-[7px] text-xs font-semibold transition-colors ${
                  selected ? "bg-brand-soft text-brand-dark" : "text-muted hover:text-ink"
                }`}
              >
                {item.short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-surface p-5">
        {offerLabel ? (
          <p className="mb-4 text-xs text-muted">
            {offerLabel}. Baseado nas ofertas monitoradas atualmente.
          </p>
        ) : null}
        {analysis.observations.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted">
            O histórico desta variação ainda está sendo formado. São necessárias coletas em dias diferentes
            para mostrar a evolução do preço.
          </p>
        ) : (
          <Chart analysis={analysis} rangeLabel={config.short} maxGapMs={maxAgeMs * 1.5} />
        )}
      </div>

      <section aria-labelledby="preco-bom" className="mt-5 rounded-[14px] border border-line bg-surface p-5">
        <h3 id="preco-bom" className="text-lg font-bold">O preço está bom?</h3>
        {analysis.assessment === "insufficient" ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ainda não há observações suficientes para avaliar este preço. Foram registrados {analysis.observedDays}
            {" "}dia(s) com coleta neste período; a análise exige pelo menos sete dias observados distribuídos
            por uma semana e um preço verificado recentemente.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {currentCents === null ? "" : `O preço atual é ${moneyShort(currentCents)}. `}
            A média dos {analysis.observedDays} dias observados em {config.short} foi {moneyShort(analysis.average!)}
            {", "}e o menor valor observado foi {moneyShort(analysis.lowest!)}. O preço atual está
            {" "}{Math.abs(difference!)}% {relativeAverage} essa média.
            {analysis.assessment === "low" ? " Está baixo em relação ao histórico disponível." :
              analysis.assessment === "high" ? " Está alto em relação ao histórico disponível." :
                " Está próximo da média do histórico disponível."}
          </p>
        )}
      </section>

      {analysis.recentChanges.length > 0 ? (
        <section aria-labelledby="mudancas-preco" className="mt-5 rounded-[14px] border border-line bg-surface p-5">
          <h3 id="mudancas-preco" className="text-lg font-bold">Alterações recentes</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {analysis.recentChanges.map((change) => (
              <li key={change.t} className="flex justify-between gap-3 border-t border-line-soft pt-2">
                <time dateTime={new Date(change.t).toISOString()}>
                  {new Date(change.t).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" })}
                </time>
                <span>{moneyShort(change.cents)} ({change.percent > 0 ? "+" : ""}{change.percent}%)</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function Chart({
  analysis,
  rangeLabel,
  maxGapMs,
}: {
  analysis: HistoryAnalysis;
  rangeLabel: string;
  maxGapMs: number;
}) {
  const series = analysis.observations;
  const t0 = series[0].t;
  const span = series[series.length - 1].t - t0 || 1;
  const lowest = analysis.lowest!;
  const highest = analysis.highest!;
  const priceSpan = highest - lowest || 1;

  const x = (t: number) => ((t - t0) / span) * W;
  const y = (cents: number) => PAD + (1 - (cents - lowest) / priceSpan) * (H - PAD * 2);

  // Não liga pontos separados por um intervalo maior que a validade da coleta.
  const path = series
    .map((point, index) =>
      index === 0 || point.t - series[index - 1].t > maxGapMs
        ? `M ${x(point.t).toFixed(1)} ${y(point.cents).toFixed(1)}`
        : `L ${x(point.t).toFixed(1)} ${y(point.cents).toFixed(1)}`,
    )
    .join(" ");

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        fill="none"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Menores preços observados em ${rangeLabel}: mínima ${moneyShort(lowest)}, média dos dias observados ${moneyShort(analysis.average!)}, máxima ${moneyShort(highest)}.`}
      >
        {[20, 80, 140, 200].map((line) => (
          <line key={line} x1="0" y1={line} x2={W} y2={line} stroke="#F1F2F5" strokeWidth="1" />
        ))}
        <path d={path} stroke="#5B5CE2" strokeWidth="2.4" fill="none" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {series.map((point) => <circle key={`${point.t}-${point.cents}`} cx={x(point.t)} cy={y(point.cents)} r="2.5" fill="#5B5CE2" />)}
      </svg>

      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{new Date(series[0].t).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
        <span>{new Date(series.at(-1)!.t).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3.5 border-t border-line pt-5">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">Menor preço</dt>
          <dd className="text-[19px] font-bold text-good">{moneyShort(lowest)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">Preço médio</dt>
          <dd className="text-[19px] font-bold">{moneyShort(analysis.average!)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">Maior preço</dt>
          <dd className="text-[19px] font-bold">{moneyShort(highest)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-muted">
        {analysis.observedDays} dia(s) com coleta em {rangeLabel}. Dias sem verificação não entram na média;
        os trechos sem dados ficam interrompidos no gráfico.
      </p>
    </>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  return (
    <svg
      height="40"
      viewBox="0 0 72 40"
      preserveAspectRatio="none"
      fill="none"
      className="block w-full flex-none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={polyline(values, 72, 40, 5)}
        stroke="#168653"
        strokeWidth="1.8"
        fill="none"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
