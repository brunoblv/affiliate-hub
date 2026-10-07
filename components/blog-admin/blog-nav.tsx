import Link from "next/link";

const LINKS = [
  { href: "/admin/blog", label: "Posts" },
  { href: "/admin/blog/novo", label: "Novo post" },
  { href: "/admin/blog/gerar", label: "Artigo com IA" },
  { href: "/admin/blog/lista", label: "Lista por pauta" },
  { href: "/admin/blog/larsmart", label: "LarSmart" },
  { href: "/admin/blog/jornada", label: "Jornada" },
  { href: "/admin/blog/blogs", label: "Blogs" },
];

/** Abas do admin dos blogs. */
export function BlogNav({ current }: { current: string }) {
  return (
    <nav aria-label="Blogs" className="mb-6 flex flex-wrap gap-1.5 border-b border-line pb-3">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === current ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${link.href === current ? "bg-brand-soft text-brand-dark" : "text-muted hover:text-ink"}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function Notice({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={`mb-5 rounded-[10px] px-4 py-3 text-[13px] font-medium ${tone === "bad" ? "bg-bad-bg text-bad-ink" : "bg-good-bg text-good"}`}>
      {children}
    </p>
  );
}
