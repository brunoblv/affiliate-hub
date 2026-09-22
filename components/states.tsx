/**
 * Shared empty / degraded states.
 *
 * A store that fails to answer degrades one card — never the whole page (§11).
 */

export function ResultSkeleton() {
  return (
    <div
      className="flex gap-5 rounded-[14px] border border-line bg-surface p-5"
      role="status"
      aria-label="Carregando resultados"
    >
      <div className="skeleton-sheen h-[148px] w-[148px] flex-none rounded-[10px]" />
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="skeleton-sheen h-5 w-[62%] rounded-md" />
        <div className="h-3.5 w-[34%] rounded-md bg-line-soft" />
        <div className="h-3.5 w-[48%] rounded-md bg-line-soft" />
        <div className="mt-auto h-3.5 w-[40%] rounded-md bg-line-soft" />
      </div>
      <div className="hidden w-[220px] flex-none flex-col gap-2.5 border-l border-line pl-5 sm:flex">
        <div className="h-3 w-[70%] rounded-md bg-line-soft" />
        <div className="skeleton-sheen h-[30px] w-[88%] rounded-lg" />
        <div className="mt-3.5 h-[42px] rounded-[9px] bg-line-soft" />
      </div>
    </div>
  );
}

export function NoOffers({ storeCount }: { storeCount: number }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-line bg-surface p-7">
      <div className="h-10 w-10 rounded-[10px] border border-line bg-canvas" aria-hidden />
      <h3 className="text-base font-bold">Nenhuma oferta disponível no momento.</h3>
      <p className="text-[13px] leading-relaxed text-muted">
        Monitoramos este produto em {storeCount} lojas. Avisaremos quando voltar a ter estoque.
      </p>
      <button
        type="button"
        className="h-[42px] rounded-[9px] bg-brand px-4.5 text-sm font-semibold text-surface transition-colors hover:bg-brand-dark"
      >
        Avise-me quando voltar
      </button>
    </div>
  );
}

export function StaleNotice({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2.5 rounded-[10px] border border-warn-line bg-warn-bg px-3.5 py-3 text-[13px] font-semibold text-warn-ink">
      <span className="h-2 w-2 flex-none rounded-full bg-warn" aria-hidden />
      {label}
    </p>
  );
}

export function CollectionFailure({ onRetryHref = "#" }: { onRetryHref?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] border border-bad-line bg-bad-bg px-3.5 py-3">
      <span className="text-[13px] font-semibold text-bad-ink">
        Não conseguimos atualizar esta oferta agora.
      </span>
      <a href={onRetryHref} className="text-xs font-bold text-bad-ink underline">
        Tentar novamente
      </a>
    </div>
  );
}

export function NoResults({ term, clearHref }: { term: string; clearHref: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-line bg-surface p-8">
      <h2 className="text-lg font-bold">
        Nenhum produto encontrado para “{term}”.
      </h2>
      <p className="text-sm text-muted">
        Verifique a grafia, use termos mais gerais ou remova os filtros aplicados.
      </p>
      <a
        href={clearHref}
        className="flex h-[42px] items-center rounded-[9px] bg-brand px-4.5 text-sm font-semibold text-surface transition-colors hover:bg-brand-dark"
      >
        Remover filtros
      </a>
    </div>
  );
}

export function UnpublishedContent() {
  return (
    <p className="rounded-[10px] border border-dashed border-line-strong bg-surface px-4 py-5 text-[13px] text-muted">
      O conteúdo editorial deste produto ainda não foi revisado e publicado.
    </p>
  );
}
