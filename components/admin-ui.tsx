import type { ReactNode } from "react";

export const inputClass =
  "h-[38px] w-full rounded-lg border border-line bg-surface px-2.5 text-[13px] outline-none focus:border-brand";

export const primaryButton =
  "h-[38px] rounded-[9px] bg-brand px-4 text-[13px] font-semibold text-surface transition-colors hover:bg-brand-dark";

export const secondaryButton =
  "h-8 rounded-lg border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand hover:text-brand";

export const dangerButton =
  "h-8 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-bad transition-colors hover:border-bad";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-5 rounded-[10px] bg-bad-bg px-4 py-3 text-[13px] font-medium text-bad-ink">
      {message}
    </p>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-[13px] text-muted">{children}</p>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.025em]">{title}</h1>
        {subtitle ? <p className="text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
