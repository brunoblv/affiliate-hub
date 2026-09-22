import type { Cents } from "./format";

/** Maps a price series onto an SVG polyline, scaled to its own min/max. */
export function polyline(values: Cents[], width: number, height: number, pad: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = pad + (1 - (value - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** The same line closed against the baseline, for the shaded area under it. */
export function areaPolyline(values: Cents[], width: number, height: number, pad: number): string {
  return `0,${height} ${polyline(values, width, height, pad)} ${width},${height}`;
}

export interface SeriesStats {
  lowest: Cents;
  average: Cents;
  highest: Cents;
  current: Cents;
  /** True when the current price sits in the bottom 10% of the observed range. */
  nearLow: boolean;
}

export function seriesStats(values: Cents[]): SeriesStats {
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const current = values[values.length - 1];
  const span = highest - lowest || 1;
  return {
    lowest,
    highest,
    current,
    average: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    nearLow: (current - lowest) / span <= 0.1,
  };
}
