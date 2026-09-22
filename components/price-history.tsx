"use client";

import { useState } from "react";
import { polyline } from "@/lib/chart";
import { moneyShort, type Cents } from "@/lib/format";

export interface HistoryPoint {
  /** epoch ms */
  t: number;
  cents: Cents;
}

type RangeKey = "30d" | "90d" | "6m" | "1a";

const RANGES: { key: RangeKey; days: number; short: string; start: string }[] = [
  { key: "30d", days: 30, short: "30 dias", start: "30 dias atrás" },
  { key: "90d", days: 90, short: "90 dias", start: "90 dias atrás" },
  { key: "6m", days: 182, short: "6 meses", start: "6 meses atrás" },
  { key: "1a", days: 365, short: "1 ano", start: "1 ano atrás" },
];

const DAY = 24 * 60 * 60 * 1000;
const W = 900;
const H = 260;
const PAD = 18;

/**
 * Preço da mesma oferta ao longo do tempo. O preço só é registrado quando muda,
 * então o gráfico é em degraus e a média é ponderada pelo tempo em cada preço.
 * `nowMs` vem do servidor para não divergir entre servidor e navegador.
 */
export function PriceHistory({ points, nowMs }: { points: HistoryPoint[]; nowMs: number }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const config = RANGES.find((item) => item.key === range)!;
  const from = nowMs - config.days * DAY;

  const before = points.filter((point) => point.t < from).at(-1);
  const inside = points.filter((point) => point.t >= from);
  const known = [...(before ? [{ t: from, cents: before.cents }] : []), ...inside];
  const last = known.at(-1);
  const series = last ? [...known, { t: nowMs, cents: last.cents }] : [];
  const distinct = new Set(series.map((point) => point.cents)).size;

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
        {series.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted">
            O histórico desta oferta ainda está sendo formado. Ele aparece aqui conforme o preço for
            atualizado.
          </p>
        ) : (
          <Chart series={series} label={config.start} rangeLabel={config.short} distinct={distinct} />
        )}
      </div>
    </section>
  );
}

function Chart({
  series,
  label,
  rangeLabel,
  distinct,
}: {
  series: HistoryPoint[];
  label: string;
  rangeLabel: string;
  distinct: number;
}) {
  const t0 = series[0].t;
  const span = series[series.length - 1].t - t0 || 1;
  const prices = series.map((point) => point.cents);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const current = prices[prices.length - 1];
  const priceSpan = highest - lowest || 1;

  const x = (t: number) => ((t - t0) / span) * W;
  const y = (cents: number) => PAD + (1 - (cents - lowest) / priceSpan) * (H - PAD * 2);

  // Degraus: mantém o preço até o instante da próxima mudança.
  const path = series
    .map((point, index) =>
      index === 0
        ? `M ${x(point.t).toFixed(1)} ${y(point.cents).toFixed(1)}`
        : `L ${x(point.t).toFixed(1)} ${y(series[index - 1].cents).toFixed(1)} L ${x(point.t).toFixed(1)} ${y(point.cents).toFixed(1)}`,
    )
    .join(" ");

  let weighted = 0;
  for (let i = 1; i < series.length; i++) weighted += series[i - 1].cents * (series[i].t - series[i - 1].t);
  const average = Math.round(weighted / span);
  const nearLow = highest > lowest && (current - lowest) / priceSpan <= 0.1;

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        fill="none"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Variação do preço em ${rangeLabel}: mínima ${moneyShort(lowest)}, média ${moneyShort(average)}, máxima ${moneyShort(highest)}.`}
      >
        {[20, 80, 140, 200].map((line) => (
          <line key={line} x1="0" y1={line} x2={W} y2={line} stroke="#F1F2F5" strokeWidth="1" />
        ))}
        <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="#EEEEFF" stroke="none" />
        <path d={path} stroke="#5B5CE2" strokeWidth="2.4" fill="none" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>Hoje</span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3.5 border-t border-line pt-5">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">Menor preço</dt>
          <dd className="text-[19px] font-bold text-good">{moneyShort(lowest)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">Preço médio</dt>
          <dd className="text-[19px] font-bold">{moneyShort(average)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">Maior preço</dt>
          <dd className="text-[19px] font-bold">{moneyShort(highest)}</dd>
        </div>
      </dl>

      {distinct === 1 ? (
        <p className="mt-4 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[13px] text-muted">
          O preço não mudou neste período.
        </p>
      ) : nearLow ? (
        <p className="mt-4 rounded-[10px] bg-good-bg px-3.5 py-2.5 text-[13px] font-semibold text-good">
          Preço atual próximo da mínima do período.
        </p>
      ) : null}
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
