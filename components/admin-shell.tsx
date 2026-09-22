import Link from "next/link";
import { adminNav } from "@/lib/data";

export function AdminShell({
  active,
  children,
}: {
  /** Label of the nav entry to mark as current. */
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-0.5 bg-ink px-3.5 py-5">
        <Link href="/" className="flex items-center gap-2.5 px-2.5 pb-5">
          <span className="h-6 w-6 rounded-[7px] bg-brand" aria-hidden />
          <span className="text-sm font-bold text-surface">Admin</span>
        </Link>

        <nav aria-label="Administração" className="flex gap-1 overflow-x-auto lg:flex-col">
          {adminNav.map((item) => {
            const current = item.label === active;
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-medium ${
                  current ? "bg-brand/20 text-surface" : "text-faint hover:text-surface"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main id="conteudo" className="px-4 pb-20 pt-7 sm:px-8">
        {children}
      </main>
    </div>
  );
}

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const tones = {
    good: "bg-good-bg text-good",
    warn: "bg-warn-bg text-warn-ink",
    bad: "bg-bad-bg text-bad-ink",
    neutral: "bg-canvas text-muted",
  } as const;

  return (
    <span
      className={`justify-self-start rounded-[5px] px-2 py-1 text-[10px] font-bold tracking-[0.04em] ${tones[tone]}`}
    >
      {label.toUpperCase()}
    </span>
  );
}

export function MethodPill({ method }: { method: string }) {
  return (
    <span className="justify-self-start rounded-[5px] bg-brand-soft px-1.5 py-[3px] font-mono text-[10px] font-semibold tracking-[0.04em] text-brand-dark">
      {method}
    </span>
  );
}

export function Dot({ tone }: { tone: "good" | "warn" | "bad" | "brand" }) {
  const tones = {
    good: "bg-good",
    warn: "bg-warn",
    bad: "bg-bad",
    brand: "bg-brand",
  } as const;
  return <span className={`h-[7px] w-[7px] flex-none rounded-full ${tones[tone]}`} aria-hidden />;
}
