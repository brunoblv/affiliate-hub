/**
 * Métricas da LOJA gravadas em `Offer` (A.10). Só entra o que a fonte informou nesta coleta:
 * ausência não apaga o número anterior, e nada é estimado.
 */
export const METRICS_MAX_AGE_DAYS = 30;

export function metricsData(
  result: { salesCount?: number | null; ratingCentis?: number | null; ratingCount?: number | null },
  now: Date,
): { salesCount?: number; ratingCentis?: number; ratingCount?: number; metricsCheckedAt?: Date } {
  const data: { salesCount?: number; ratingCentis?: number; ratingCount?: number; metricsCheckedAt?: Date } = {};
  if (result.salesCount != null) data.salesCount = result.salesCount;
  if (result.ratingCentis != null) data.ratingCentis = result.ratingCentis;
  if (result.ratingCount != null) data.ratingCount = result.ratingCount;
  if (Object.keys(data).length > 0) data.metricsCheckedAt = now;
  return data;
}

/** Métrica com mais de 30 dias vira "sem dado recente" em vez de número velho. */
export function metricsAreFresh(checkedAt: Date | null, now = new Date()): boolean {
  return checkedAt !== null && now.getTime() - checkedAt.getTime() <= METRICS_MAX_AGE_DAYS * 86_400_000;
}
