export type RawParams = Record<string, string | string[] | undefined>;

export function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function asText(value: string | string[] | undefined): string {
  return asList(value)[0] ?? "";
}

/** Reads "1.299,90" or "1299.90" as cents; returns undefined when not a number. */
export function asCents(value: string | string[] | undefined): number | undefined {
  const text = asText(value).replace(/\./g, "").replace(",", ".").trim();
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

function toSearchParams(params: RawParams): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of asList(value)) {
      if (item !== "") search.append(key, item);
    }
  }
  return search;
}

export function buildHref(base: string, params: RawParams): string {
  const search = toSearchParams(params).toString();
  return search ? `${base}?${search}` : base;
}

/** The same URL minus one value of a repeated param — powers the removable chips. */
export function hrefWithout(base: string, params: RawParams, key: string, value?: string): string {
  const next: RawParams = { ...params };
  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = asList(params[key]).filter((item) => item !== value);
  }
  return buildHref(base, next);
}
